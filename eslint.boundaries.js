// Import boundaries (see docs/superpowers/specs/2026-10-25-data-architecture-design.md).
// Core `no-restricted-imports` with `regex` patterns (regex is tested against the import source).
// A later config object replaces the options of an earlier one for the same rule, so each scope
// below lists everything it forbids; the scopes are disjoint, so nothing is lost.

const fs = require('fs');
const path = require('path');

// `@/x` and `../x` (any depth) for the given top-level source folders.
const toFolders = (folders) => {
  const group = folders.join('|');
  return [`^@/(${group})(/|$)`, `^(\\.\\./)+(${group})(/|$)`];
};

const patterns = (list, message) => list.map((regex) => ({ regex, message }));

const restrict = (files, list, message) => ({
  files,
  rules: { 'no-restricted-imports': ['error', { patterns: patterns(list, message) }] },
});

function listFeatures(srcDir = path.resolve('src')) {
  const featuresDir = path.join(srcDir, 'features');
  if (!fs.existsSync(featuresDir)) return [];
  return fs
    .readdirSync(featuresDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function boundaryConfigs(features) {
  const featureBlocks = features.map((name) =>
    restrict(
      [`src/features/${name}/**/*.{ts,tsx,js,jsx}`],
      [
        ...toFolders(['app', 'screens']),
        // Another feature: `@/features/<other>` (lookahead keeps the feature's own path allowed).
        `^@/features/(?!${name}(/|$))`,
        // Inside a feature use `./` or `@/features/${name}/...`, never `../`.
        '^\\.\\./',
      ],
      `A feature must not import app, screens or another feature; inside ${name} use ./ or @/features/${name}/..., never ../`,
    ),
  );

  return [
    ...featureBlocks,
    restrict(
      [
        'src/lib/**/*.{ts,tsx,js,jsx}',
        'src/stores/**/*.{ts,tsx,js,jsx}',
        'src/hooks/**/*.{ts,tsx,js,jsx}',
        'src/i18n/**/*.{ts,tsx,js,jsx}',
        'src/env.ts',
      ],
      toFolders(['components', 'features', 'screens', 'app']),
      'lib, stores, hooks, i18n and env must not import UI, features, screens or app',
    ),
    restrict(
      ['src/components/**/*.{ts,tsx,js,jsx}'],
      toFolders(['features', 'screens', 'app']),
      'components must not import features, screens or app',
    ),
  ];
}

module.exports = { boundaryConfigs, listFeatures };
