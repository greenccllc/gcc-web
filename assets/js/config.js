// Staff sign-in client config — consumed by /staff/login.html.
// Materialized at deploy time; do NOT commit secrets to this file
// (Client ID is public, fine to commit; client secret is held only
// in Cloudflare Access + Secret Manager).
//
// Generated: 2026-05-01. To rotate, update Secret Manager:
//   admin-staff-google-client-id  (public, this file)
//   admin-staff-google-client-secret (private, CF Access only)
window.GCC_AUTH_CONFIG = {
  // IAP-managed OAuth client under brand projects/699304045834/brands/699304045834
  // (orgInternalOnly=true → only @greencommllc.com Workspace users can sign in).
  googleClientId: '699304045834-e3mr7uusj76kimo5hum5etnjcgokll4c.apps.googleusercontent.com',
  allowedDomain:  'greencommllc.com',
};
