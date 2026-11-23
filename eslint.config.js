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
    // docs/components.md: own components take `ref` as a prop; vendored gluestack keeps upstream forwardRef.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/components/ui/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "ImportDeclaration[source.value='react'] ImportSpecifier[imported.name='forwardRef']",
          message:
            'Take `ref` as a prop (docs/components.md); forwardRef is only for vendored src/components/ui.',
        },
      ],
    },
  },
  {
    ignores: [
      'dist/*',
      'android/*',
      'ios/*',
      '.expo/*',
      '.claude/worktrees/**',
      'expo-env.d.ts',
      'src/uniwind-types.d.ts',
    ],
  },
]);
