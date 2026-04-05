import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'

export default [
  layout('./routes/_layout.tsx', [
    index('./routes/_layout.index.tsx'),
    route(':chatId', './routes/_layout.$chatId.tsx'),
  ]),
  route('admin', './routes/admin.tsx'),
  route('login', './routes/login.tsx'),
  route('login/sso-callback', './routes/login/sso-callback.tsx'),
  route('memory', './routes/memory.tsx'),
  route('memory-demo', './routes/memory-demo.tsx'),
  route('share/:shareId', './routes/share.$shareId.tsx'),
  route('signup', './routes/signup.tsx'),
  route('signup/sso-callback', './routes/signup.sso-callback.tsx'),
] satisfies RouteConfig
