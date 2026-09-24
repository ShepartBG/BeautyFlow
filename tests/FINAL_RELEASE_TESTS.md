# BeautyFlow Final Release Candidate tests

## Local release gate
1. `npm run build`
2. `npm run test:release:headed`
3. `npm run test:browser:mobile`

The release suite contains the existing public/admin regression checks, real booking E2E,
waitlist E2E and additional non-destructive admin functional UI checks.

## Production-safe gate
After deployment set TEST_BASE_URL to the production URL and run:
`npm run test:production:safe:headed`

This production suite is intentionally read-only: it does not create/delete appointments,
waitlist entries, staff, services or business settings.

## Not automated without dedicated test credentials/environment
Owner-only destructive actions, real Resend inbox delivery, password-reset completion and
external email-provider delivery should be verified separately with dedicated test accounts.
