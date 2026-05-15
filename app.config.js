import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const mobileExpoConfig = require('./apps/mobile/app.json').expo

function prefixMobilePath(value) {
  if (typeof value !== 'string' || !value.startsWith('./')) {
    return value
  }

  return `./apps/mobile/${value.slice(2)}`
}

function mapPlugin(plugin) {
  if (!Array.isArray(plugin) || plugin[0] !== 'expo-splash-screen') {
    return plugin
  }

  const options = plugin[1]
  if (!options || typeof options !== 'object') {
    return plugin
  }

  return [
    plugin[0],
    {
      ...options,
      image: prefixMobilePath(options.image),
    },
  ]
}

export default () => ({
  expo: {
    ...mobileExpoConfig,
    icon: prefixMobilePath(mobileExpoConfig.icon),
    ios: {
      ...mobileExpoConfig.ios,
      infoPlist: {
        ...mobileExpoConfig.ios?.infoPlist,
      },
    },
    android: {
      ...mobileExpoConfig.android,
      adaptiveIcon: mobileExpoConfig.android?.adaptiveIcon
        ? {
            ...mobileExpoConfig.android.adaptiveIcon,
            backgroundImage: prefixMobilePath(
              mobileExpoConfig.android.adaptiveIcon.backgroundImage
            ),
            foregroundImage: prefixMobilePath(
              mobileExpoConfig.android.adaptiveIcon.foregroundImage
            ),
            monochromeImage: prefixMobilePath(
              mobileExpoConfig.android.adaptiveIcon.monochromeImage
            ),
          }
        : undefined,
    },
    plugins: mobileExpoConfig.plugins?.map(mapPlugin),
    extra: {
      ...mobileExpoConfig.extra,
    },
  },
})
