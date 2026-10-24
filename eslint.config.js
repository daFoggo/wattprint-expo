// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const { boundaryConfigs, listFeatures } = require('./eslint.boundaries');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  ...boundaryConfigs(listFeatures()),
  {
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*', 'expo-env.d.ts', 'src/uniwind-types.d.ts'],
  },
]);
