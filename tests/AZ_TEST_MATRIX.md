# BeautyFlow A-Z release gate

This suite does not add product features. It exercises existing behavior.

## Business lifecycle
- Public access request through the real form and anti-bot math challenge
- Platform Owner login and request approval
- Creation of the linked business account
- Login as the newly approved business owner
- Initial business settings/onboarding save
- Service create, hide, activate and delete
- Weekly schedule persistence
- Owner cleanup of the temporary E2E business

## Existing regression coverage included in test:az
- Public pages and hydration/runtime errors
- Admin routes and navigation
- Admin functional surfaces
- Real public availability
- Email-code booking flow in local E2E mode
- Booking visible in Admin Bookings and Calendar
- Booking delete and slot release
- Waitlist create -> Admin -> assign -> Calendar -> cleanup

## Local-only E2E safeguards
When NODE_ENV is not production and BEAUTYFLOW_E2E_MODE=1, access-request/approval email delivery is bypassed and TEST_NEW_ADMIN_PASSWORD is used for the temporary approved account. Production behavior is unchanged.
