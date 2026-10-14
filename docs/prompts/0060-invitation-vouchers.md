# Request

Sanitized feature requirements (private correspondence omitted): add free admin-issued prelaunch invitations, with class credits or COP balance selected by the admin, and participant limits independent of that benefit. Include presets for up to two people, COP 60,000 for up to two people, and COP 80,000 for up to four. Prepare WhatsApp/email previews, recipient activation, self-and-guest booking, retained guest details, and an audit trail through attendance. Align the experience with gift cards while retaining separate purchase records.

User clarification: “Those are free... can be either a credit or cop amount depending on how the admin issues it”.

## Response

Implemented M-13 and C-28 in the existing testing app, with a browser-local atomic domain service and database contract. Test settings explicitly configure cap scope, credit unit, cancellation restoration and optional expiry. No real voucher was issued and no external message, payment or production database write was made. Purchased gift settlement remains an explicit server-side integration contract. Coming Soon and content publishing controls are unchanged.
