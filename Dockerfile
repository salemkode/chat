# syntax=docker/dockerfile:1.7

FROM node:20.19-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.6.5 --activate

COPY . .

ARG VITE_CONVEX_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_AUTH_FRONTEND_URL

ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_AUTH_FRONTEND_URL=$VITE_AUTH_FRONTEND_URL

RUN pnpm install --frozen-lockfile --filter web...
RUN pnpm --filter web run build

FROM nginx:1.27-alpine AS runner
WORKDIR /usr/share/nginx/html

RUN cat <<'EOF' > /etc/nginx/conf.d/default.conf
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;

  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
EOF

COPY --from=builder /app/apps/web/dist/client ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
