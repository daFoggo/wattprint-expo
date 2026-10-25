// https://docs.expo.dev/guides/using-eslint/
/* global __dirname */
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const { boundaryConfigs, listFeatures } = require('./eslint.boundaries');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  ...boundaryConfigs(listFeatures()),
  {
    // Type-aware rule: fails on use of anything marked @deprecated in the installed typings.
    files: ['src/**/*.{ts,tsx}'],
    // Vendored gluestack code keeps its upstream API (forwardRef, ElementRef, ...).
    ignores: ['src/components/ui/**'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: __dirname } },
    rules: { '@typescript-eslint/no-deprecated': 'error' },
  },
  {
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*', 'expo-env.d.ts', 'src/uniwind-types.d.ts'],
  },
]);
