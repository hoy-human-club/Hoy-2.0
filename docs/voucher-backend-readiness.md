# Invitation voucher backend readiness

The UI and `DataProvider.voucher()` run only in MockProvider. Nothing here issues a real invitation, sends email or WhatsApp, charges money, or creates an authentication account. `SupabaseProvider` remains unconnected and does not implement this optional method.

## Explicit contract

- An admin invitation is free, with class units or whole COP; the participant cap is independent of benefit value
- Admins choose expiration (an explicit null means none), credit unit (per person or booking), participant scope (per booking or lifetime), and cancellation restoration/forfeiture
- Lifetime means attendee seats across non-cancelled voucher bookings; it is not a count of unique people. Cancellation releases those seats, including with benefit forfeiture
- COP quotations are supplied in the demo, in whole pesos per participant. Production must calculate these server-side from trusted studio pricing. No partial payment or top-up is offered
- Claim binds the voucher to a verified demo member ID. A code is only a demo reference, not a production secret. Viewing a page does not claim or redeem anything
- Booking reserves/debits benefit once; attendance records redemption without charging again. Cancellation restores once only when configured; attended bookings cannot be cancelled
- Delivery preview creates only a `preview_only` audit event
- Group attendees are held in `voucher_bookings`, not invented authentication accounts. Seats and mats count alongside normal bookings
- The `PurchasedGiftBridge` interface reserves future purchase origin, settled payment identity and uniqueness contract. It has no browser issuance method. Future fulfillment must independently verify settlement, protect against webhook replay and preserve the same claim/redemption model

## Atomicity and audit

Commands validate on a deep copy, then commit all changed tables synchronously. A rejected command leaves balances, capacity and history untouched. Request keys reject payload conflicts and return the original result for exact retries. Voucher tables reject generic CRUD; reads return copies. Audit history is append-only through the command seam.

This is single-instance browser atomicity only. Local storage is editable, may fail to persist, resets with the demo seed, and does not provide cross-tab locking or trustworthy identity. Actor IDs and roles in commands are simulation inputs, never acceptable production authorization. Do not use this implementation for real issuance.

## Required before connecting a real backend

1. Authenticated transactional RPCs deriving tenant and actor from the session, never request role/tenant fields
2. Database constraints, row locks and idempotency uniqueness across workers; transactional class capacity and mat reservations across ordinary and voucher bookings
3. Cryptographically random, hashed, expiring claim secrets; rate limiting and verified recipient/account binding
4. Server-authoritative price quotation, availability, cancellation rules and trusted clock
5. Scoped owner/staff reads excluding other guests' contacts; immutable audit enforcement and retention/privacy policy
6. Authenticated delivery jobs, recipient consent, delivery-state webhooks and retries; no false “sent” state before provider confirmation
7. Verified payment webhooks, settlement uniqueness and reconciliation for future purchased gifts

Generated voucher tables have RLS enabled and intentionally no client policies. Their camelCase contract columns are quoted in SQL. They are schema drafts, not runnable production RPCs. Review and add appropriate constraints and policies in a migration before enabling access.

Run `node --experimental-strip-types scripts/test-vouchers.mjs` for domain regression coverage.
