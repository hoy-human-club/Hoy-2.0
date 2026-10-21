# Batch 1 — AD-07 / HALL-2: CRM package balances

Scope: AD-07 (MVP Oct 30, High), related PR-06 calculation consistency. Baseline/rollback `2d402751c5bee899d5adab62837d2b0e7e313025`. Source acceptance remains Not verified; local implementation and fresh verification recorded separately below.

Problem: CRM joined legacy memberships only; the launch package lives in class_ledger, so package holders displayed No plan. Changes: CRM list/detail share packageState with the customer app, display remaining classes and expiry, identify frozen packages, and show explicitly claimed vouchers. Mobile cards expose balances without horizontal table scrolling. Search now uses the shared name/phone/email matcher, including normalized phone spacing. Existing route role arrays are unchanged.

Deep links: [CRM](https://imagine-os.github.io/hoy/#/admin/crm), [fictional customer](https://imagine-os.github.io/hoy/#/admin/crm/usr_cust). These links require a current allowed demo role selected in Hub. Demo fixture data is browser-local; no operational transaction or persistent backend is connected.

Contract for Anu: return authenticated tenant-scoped users/profiles, class_ledger, plans and vouchers via DataProvider. The package calculation is exactly the customer-side packageState semantics; server entitlement allocation/expiry is authoritative and remains to be verified separately. Voucher identity uses claimedBy=user.id only; recipientName/contact are not identity proof. Unclaimed vouchers remain in the voucher management surface. No role-permission settings, database, storage, credentials or backend data changed.

Verification command: `node scripts/test-crm-balances-ui.mjs` (QA_BASE optionally selects built/live target; isolated contexts; fictional ledger and voucher fixtures). Checks package classes/expiry/catalog name, claimed-only identity, list/detail, EN/ES 390/1280, empty search, missing record, frozen/expired package, admin/front-desk roles, customer denial and runtime exceptions. MockProvider has synchronous snapshots; asynchronous loading/rejection/retry still needs shared data-hook work and is explicitly unverified. A missing-record error is distinct from a backend/network error.

Captures: [EN mobile](../screenshots/M-06/en-390-balances.jpg), [ES mobile](../screenshots/M-06/es-390-balances.jpg), [EN desktop](../screenshots/M-06/en-1280-balances.jpg), [ES desktop](../screenshots/M-06/es-1280-balances.jpg), [EN detail](../screenshots/M-06/en-1280-package-detail.jpg), [test receipt](../screenshots/M-06/balance-results.json).

Local evidence: production build/TypeScript/spacing/manual checks passed; CRM fixture suite passed against both dev and production bundle; analytics domain regression and protected capture policy passed; phone/desktop list/detail captures visually reviewed. All-route smoke passed for 121 routes with no console errors; exact-head release checks remain pending.

Release: pending source commit. Do not interpret this receipt as deployed until source SHA and live verification are appended.
