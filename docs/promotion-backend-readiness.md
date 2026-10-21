# Promotion production contract

The implemented flows are a browser-local sandbox. No live authentication, private entitlement delivery, remote booking, provider-confirmed messages, payments or enforceable legal acceptance is provided.

## Model and authority

- An administrator drafts an offer, reviews benefits/eligibility/budget/expiry, and explicitly publishes an approved campaign through existing publishing controls. Teachers cannot edit campaign economics or publish drafts.
- Each share has a unique studio-scoped code, original promoter, campaign, optional private recipient/context and outward invitation text. Public codes are routing/attribution identifiers, never proof of identity or authorization to spend a balance.
- Each verified claimant receives a separate voucher. A unique `(tenant, campaign, user)` constraint prevents duplicate entitlements across links. Freeze the first share/promoter at claim; keep attribution distinct from the instructor who teaches the class.
- Private single-recipient invitations require secure unguessable tokens and verified recipient binding; readable reusable campaign codes are insufficient for that use case.

## Required server work

1. Authenticated transactional RPCs derive tenant/user/role from a trusted session. Default-deny RLS and allowlisted public offer projections must replace browser table access. Teachers read only their own share context and aggregated results; reception sees only operationally needed claimant/booking details.
2. Enforce approval/publication state, dates, eligibility, total claim and budget caps, a shared promotion/voucher code namespace and reserved names, per-account limits and rate limits atomically. Server quotations determine any COP cost.
3. Claim, book, cancel, confirmation and attendance need stable idempotency keys, row locks and append-only auditable events. Capacity, mats and balance changes must commit together. Promotion attendance requires prior verified reception confirmation. Confirmation/attendance must never debit again; cancellation/refund policy and cutoff are explicit.
4. Lookup accepts canonical code or verified studio full URL. QR/scanner hardware is deferred; a future input adapter can supply the same code parser without changing redemption semantics.
5. Preserve attribution through sign-up/return navigation and test cross-device and concurrent requests. Current browser-local links cannot fulfill that promise.
6. Track created/copy/native-share handoff separately from provider-confirmed delivery. Native sharing cannot reveal the selected recipient or prove delivery. Do not count staff previews, link unfurls or refreshes as unique human visits. This sandbox does not invent visit metrics.
7. Validate terms/privacy/waiver versions and explicit acceptance requirements before real signup, guest registration, booking and check-in. Existing draft legal pages and fictional contact-consent checkbox are not a legally valid waiver or production consent gate. Counsel review, actual published document identifiers and durable consent records are prerequisites.
8. Purchased gift cards remain a separate settled-payment source. Never mint them from a client-provided payment success flag.

## Tests before enabling live use

ES/EN/mobile and accessibility; anonymous/public projection privacy; recipient verification; teacher/reception/admin boundaries; revoked/expired/paused/cap-exhausted offers; repeated claim via another promoter; wrong/foreign URL; duplicate/same-name guests; capacity/mat races; cancellation cutoff; duplicate confirmation/check-in; cross-device persistence and audit reconciliation. The present mock does not provide server concurrency guarantees.
