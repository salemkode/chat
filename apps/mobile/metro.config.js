const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')
const { withUniwindConfig } = require('uniwind/metro')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@convex': path.resolve(workspaceRoot, 'convex'),
}

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  polyfills: { rem: 14 },
})
