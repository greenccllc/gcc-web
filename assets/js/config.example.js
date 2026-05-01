// Example config for /staff/login.html. Copy to assets/js/config.js
// and substitute your Google OAuth Client ID. The deployed site loads
// this file from /assets/js/config.js on the login page.
//
// See docs/runbook-staff-auth.md for how to create the Google OAuth
// Client ID + (optionally) wire it into Secret Manager so publish.ps1
// renders this file at deploy time.
window.GCC_AUTH_CONFIG = {
  googleClientId: 'REPLACE_WITH_xxxxxxxxxxxxx.apps.googleusercontent.com',
  allowedDomain:  'greencommllc.com',
};
