export default function (api) {
  api.cache(true)
  process.env.EXPO_ROUTER_APP_ROOT = './apps/mobile/app'

  return {
    // Transpile # private fields from deps (e.g. worklets/reanimated); hermes-stable profile skips that.
    presets: [['babel-preset-expo', { unstable_transformProfile: 'hermes-v0' }]],
    plugins: [
      [
        'react-native-worklets/plugin',
        {
          strictGlobal: true,
          bundleMode: true,
          workletizableModules: ['remend'],
        },
      ],
    ],
  }
}
