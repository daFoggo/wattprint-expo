// Points AGP at an SDK CMake >= 4.0 (long-path capable ninja) via android/local.properties,
// so native builds do not hit the Windows 260-character path limit. See docs/setup-notes.md.
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function findCmakeDir() {
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdk) return null;
  const root = path.join(sdk, 'cmake');
  if (!fs.existsSync(root)) return null;
  const parse = (v) => v.split('.').map((n) => parseInt(n, 10) || 0);
  const cmp = (a, b) => {
    for (let i = 0; i < 3; i++) {
      const d = (a[i] || 0) - (b[i] || 0);
      if (d) return d;
    }
    return 0;
  };
  const versions = fs
    .readdirSync(root)
    .filter((v) => /^\d+\.\d+(\.\d+)?/.test(v) && parseInt(v, 10) >= 4)
    .sort((a, b) => cmp(parse(a), parse(b)));
  if (!versions.length) return null;
  return path
    .join(root, versions[versions.length - 1])
    .split(path.sep)
    .join('/');
}

module.exports = function withAndroidCmakeDir(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const cmakeDir = findCmakeDir();
      if (!cmakeDir) {
        console.warn(
          '[with-android-cmake-dir] No SDK CMake >= 4.0 found (or ANDROID_HOME unset); skipping cmake.dir.',
        );
        return cfg;
      }
      const file = path.join(cfg.modRequest.platformProjectRoot, 'local.properties');
      const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      const lines = existing.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('cmake.dir='));
      lines.push(`cmake.dir=${cmakeDir}`);
      fs.writeFileSync(file, lines.join('\n') + '\n');
      return cfg;
    },
  ]);
};
