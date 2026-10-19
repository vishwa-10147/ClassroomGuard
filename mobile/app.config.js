// Extends app.json with values that differ per installation.
// EAS_PROJECT_ID: the college's Expo (EAS) project, needed for push notifications.
// Create it with `npx eas init` in this folder, then build with EAS_PROJECT_ID set.
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    eas: {
      ...config.extra?.eas,
      projectId: process.env.EAS_PROJECT_ID || config.extra?.eas?.projectId,
    },
  },
});
