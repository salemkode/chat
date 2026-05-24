# Netlify Deployment

The web app is a React Router SPA hosted from `apps/web/dist/client`.

Netlify must serve `index.html` for client-side routes so refreshing paths like `/chat/123` does
not return a 404. This is configured in two places:

- `apps/web/netlify.toml`
- `apps/web/public/_redirects`, which is copied into `dist/client`

Both include the same routing order:

```txt
/assets/* /assets/:splat 200
/* /index.html 200
```

The asset rule keeps stale chunk requests in `/assets/*`. The app-shell rule handles browser route
reloads.
