const path = require('path');
const { getConfig } = require('react-native-builder-bob/babel-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');

const workletsPluginOptions = {
  bundleMode: true,
  strictGlobal: true,
  workletizableModules: ['remend'],
};

module.exports = getConfig(
  {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          safe: false,
          allowUndefined: true,
        },
      ],
      ['react-native-worklets/plugin', workletsPluginOptions],
    ],
  },
  { root, pkg }
);
