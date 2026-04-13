import { type RouteConfig, index, layout, prefix, route } from '@react-router/dev/routes'

export default [
  layout('./routes/_layout.tsx', [
    index('./routes/_layout.index.tsx'),
    route('projects/:projectId', './routes/_layout.projects.$projectId.tsx'),
    route(':chatId', './routes/_layout.$chatId.tsx'),
  ]),
  ...prefix('admin', [
    layout('./routes/admin._layout.tsx', [
      index('./routes/admin._index.tsx'),
      route('providers', './routes/admin.providers.tsx'),
      route('models', './routes/admin.models.tsx'),
      route('collections', './routes/admin.collections.tsx'),
      route('usage', './routes/admin.usage.tsx'),
      route('offers', './routes/admin.offers.tsx'),
      route('settings', './routes/admin.settings.tsx'),
    ]),
  ]),
  route('login', './routes/login.tsx'),
  route('login/sso-callback', './routes/login/sso-callback.tsx'),
  route('memory', './routes/memory.tsx'),
  route('memory-demo', './routes/memory-demo.tsx'),
  route('share/:shareId', './routes/share.$shareId.tsx'),
  route('signup', './routes/signup.tsx'),
  route('signup/sso-callback', './routes/signup.sso-callback.tsx'),
] satisfies RouteConfig
