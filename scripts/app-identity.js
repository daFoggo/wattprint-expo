// Maps EXPO_PUBLIC_APP_ENV to the application id suffix. CommonJS so app.config.ts can require it.
const SUFFIXES = { development: '.dev', preview: '.preview', production: '' };
const ENVS = Object.keys(SUFFIXES);

function identitySuffix(env) {
  if (!Object.prototype.hasOwnProperty.call(SUFFIXES, env)) {
    throw new Error(`Invalid EXPO_PUBLIC_APP_ENV: ${env}`);
  }
  return SUFFIXES[env];
}

function applicationId(base, env) {
  if (typeof base !== 'string' || base.length === 0) {
    throw new Error('applicationId: base identifier must be a non-empty string');
  }
  return `${base}${identitySuffix(env)}`;
}

module.exports = { ENVS, identitySuffix, applicationId };
