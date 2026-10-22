# Decision and owner queues

No messages sent. Source: acceptance workbook stable IDs/PC questions, read 2026-10-21. Frontend work continues independently where possible.

## Questions for Jas

- PG-03 / PC-01: Does 15 minutes end at receipt upload or staff confirmation? What happens outside front-desk hours?
- PG-06 / PC-02: Does the one-hour wait begin at booking creation or one hour before class?
- RS-09, RS-10 / PC-04: May customers cancel and recover a class, beyond rescheduling?
- RS-04 / PC-05: Does one class per person per day still apply?
- PR-03 / PC-06: Confirm single/private class prices; keep provisional values clearly identified.
- PR-05 / PC-07: How is Santa María affiliation verified?
- SW-05 / PC-08: Confirm final brand/contact email.
- SW-06: Define public vs internal documentation. Do not change the role matrix while approval is unresolved.
- PG-16 / PC-12: Must receipts show VAT without invoices? Prototype only while pending.

## Actions for Justin

- AC-01: Reconcile and approve source scope with the club; retain launch/November/later labels in the duplicate.
- AC-05 / PC-11: Confirm support response times through November 30.
- PL-01: Confirm ownership of domain, hosting, email, database and vendor accounts. No account mutation authorized here.
- PL-13 / PC-09: Confirm whether migration exists, and provide sanitized field/volume contract to Anu; no production data in fixtures.
- AD-07: Review demo CRM balances and mobile cards, then record owner acceptance separately from engineering evidence.
- Front End Dev Log: parent spreadsheet worker updates the [authoritative duplicate](https://docs.google.com/spreadsheets/d/19SWDF957P55Iw5QEPyVtoPDS50-eor0k76djVv1YyNU/edit) from stable-ID repository evidence; original remains untouched.

## Backend decisions and dependencies for Anu

- PL-02, PL-04, PL-05: authenticated DataProvider, tenant isolation, server permissions and cross-device tests. Client role previews do not prove authorization.
- CU-03, CU-04, CU-07: email OTP/Google contract, expiry/retry/lockout and old-email notification; WhatsApp remains later phase.
- PG-01…PG-09, RS-06/07: receipt storage/validation, authoritative payment states, idempotent confirmations, holds and atomic capacity. Resolve Jas timing questions first.
- PR-01…PR-06: authoritative product/effective price and entitlement allocation contract; frontend master comes next.
- NT-01…NT-04 / PC-03: sender domain, delivery events and destination for bank alerts. No messages sent by the frontend program.
- AD-07, PR-06: tenant-scoped ledger/package/voucher read contracts in batch-01; cross-device consistency and read-failure behavior still pending.
- BO-01…BO-06: secure claims and gift settlement bridge; existing mock commands must not become real purchases.
- PL-08: backups and verified restore; operational work excluded here.
- MK-01 / issue54: approved durable photo-storage integration, migration/re-upload policy and separate draft/publication boundaries. Browser-local photos are not shared cloud storage.

## Preserved source conflicts / separate follow-ups

- Older source grants reception expense access; newer workbook denies Finance: do not expand roles pending approval.
- Older no-refund wording versus PG-11/FI-01 future refunds: do not rewrite legal policies.
- Older on-the-hour starts versus newer :10 timetable: keep separate from booking/payment logic.
- Clerk development adapter/tests allowed separately; production host and access policy unresolved. No security configuration changes in this batch.
- Six-month validity/private max6, teacher biographies (Jennifer pending), class descriptions, customer mat removal with retained capacity, 50-minute display, analytics custom dates, transfer-first receipt flow, focus-cycle start and teacher export/Cuentas require source reconciliation; do not overwrite past purchases.

## Future frontend prototype contracts (batches11–12)

- IN-03 / Anu: authorized Google OAuth/server push and provider readback; owner confirms reception hours before operational sync. Local dry-run never updates Google or sync timestamps.
- OT-02 / owner: actual checklist location, signoff and operational thresholds remain unresolved. Sample minimum is optional/null by default. No operational safety guidance inferred.
- OT-02 / Anu: authenticated tenant-scoped maintenance reads/commands, revision/idempotency and attachments contract. Current records are explicitly fictional browser-local drafts; no alerts, orders, assignments, class blocking or device control.

## Bounded frontend handoff contracts · batches30–35

- FI-03 / Anu: atomic authenticated draft regeneration across all selected cadence periods, unique period/status locks and current-result replay. Approved/paid history remains unchanged. Approval/settlement verification is separate; no real payout tested.
- RS-15 / Anu: authenticated atomic capacity/RSVP/payment and authoritative event history/clock, followed by actual confirmation delivery. The tested slice is fictional zero-due RSVP and own unpaid cancellation only; paid flows and unresolved cancellation policy remain separate.
- NT-05 / Anu: durable authenticated immutable template versions and audit history, delivery/rendering contracts. Current local self-tests never deliver email; edit/rollback safeguards are a separate active frontend batch.
- FI-04 / Anu: authenticated atomic expense/audit commands and server-enforced paid-delete guard across every entry path. The active M09c repair is mock-only; generic provider/direct calls do not establish universal enforcement. Existing route roles and the reception source conflict are unchanged.
