// Maps EXPO_PUBLIC_APP_ENV to the application id suffix. CommonJS so app.config.ts can require it.
const SUFFIXES = { development: '.dev', preview: '.preview', production: '' };

function identitySuffix(env) {
  if (!Object.prototype.hasOwnProperty.call(SUFFIXES, env)) {
    throw new Error(`Invalid EXPO_PUBLIC_APP_ENV: ${env}`);
  }
  return SUFFIXES[env];
}

const applicationId = (base, env) => `${base}${identitySuffix(env)}`;

module.exports = { identitySuffix, applicationId };
