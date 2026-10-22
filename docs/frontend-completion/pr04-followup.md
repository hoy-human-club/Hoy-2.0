# PR-04 read-only follow-up — trial eligibility

Reviewed the authorized repository worktree `/workspace/hoy-quotes`, branch `codex/operational-quotes`, checked-out HEAD `ef5a46da7568ca0f676197f05fe0d6481da8faf0`, including its current uncommitted operational-quote changes. This is source inspection, not a tested fix or acceptance receipt. No runtime files, historical terms, Git state or source tracker were changed. Batch18 auth runtime remains frozen.

## Preserved requirement

Authoritative manifest `docs/frontend-completion/features.json`, PR-04, Products, “Trial class rule”:

> The trial class can be bought only once per person and is not offered to someone with an active package.

Original phase **MVP Oct 30**, priority **High**, role **Cliente**, source **Not verified**, demo **Visto / Seen**, related test **CLI-13**. Existing implementation remains partial; source acceptance is unchanged. C-07's 0051 page documentation says people with classes left see a package notice; that notice does not supersede the manifest's exclusion.

## Existing predicates, without changing their meaning

- `src/data/packages.ts`, `approvedPackageRows`: a positive purchase linked to a payment is usable only when the matching user/tenant payment is approved. Unlinked historical grants retain their terms. This helper does not migrate or establish authoritative historical allocation.
- `packageLots`: reconstructs remaining balances by original lot, explicit purchase/payment references first, with the existing deterministic legacy fallback. Debits/restorations retain their allocation; do not rewrite the purchases to implement trial eligibility.
- `packageState`: live lots have remaining classes and no expiry or `expires_at >= today` (inclusive). `left` includes frozen lots; `balance` excludes currently frozen lots. `purchase` selects a live remaining `reason: purchase` lot whose original `delta > 1`, even when it is frozen. Its model comment calls this the newest live package purchase. Balance also includes one-class and nonpurchase grants, so `balance > 0` alone does not identify a multi-class package.
- `selectPackagePurchase`: selects a remaining lot valid and unfrozen both today and on the class day. That is the package-spending predicate; the PR-04 exclusion does not explicitly define whether the same class-day condition applies to trial eligibility.
- `src/data/deskBooking.ts`: uses approved rows, lot selection and current/class-day expiry/freeze checks; an exact new payment spends that purchase rather than an older lot. This does not itself assert trial eligibility.
- `src/modules/customer/hooks.ts`, `useEntitlements`: computes package state from approved rows. `trialUsed` means any trial booking or an approved `plan_trial` payment. The existing booking-status interpretation includes cancelled/no-show/other historical trial bookings; this review does not relax it or reinterpret refunds.

## Concrete gaps

1. **Offers:** `PassesPage.tsx` hides trial only for `trialUsed`; active-package customers see a notice but can still choose trial. `CheckoutPage.tsx` uses the same repeat-only condition. A forced/stale `?pass=trial` can remain selected, and its confirm control does not independently require the selected choice to remain eligible.
2. **Quoted customer approval:** `payments.ts`, `assertTrialAvailable`, checks only previous trial payments/bookings, not package lots. `recordPayment` invokes it only for quoted approved trial payments. The current helper is not a complete PR-04 assessment.
3. **Desk:** `staff/RegisterPage.tsx` offers trial to the selected customer regardless of active package. Its transaction invokes the repeat-only helper for nonpending trial sales; the Wompi-link pending branch skips that check. Do not change desk methods, roles, special charges or affiliate verification while repairing trial eligibility.
4. **Transfer:** `transfers/receipts.ts` duplicates the repeat-only check at approval. Submission has no fresh trial eligibility assessment. A package may become active after a trial request is submitted and before staff approves it. Approval must recheck current eligibility atomically; ineligibility must not silently reject, reprice, refund or activate an existing request.
5. **Shared coverage:** no shared assessment currently drives both visible offers and staged sale/review logic. `MockProvider` booking insertion does not supply a separate trial eligibility rule. Backend identity and transaction enforcement remain unimplemented.

## Bounded follow-up, subject to preserved unresolved cases

Introduce a pure eligibility assessment and fresh user/tenant-scoped assertion used consistently by customer offers, checkout confirmation, selected-customer desk offers, trial request/sale creation and receipt approval. Reuse existing approved-row/lot reconstruction; do not derive historical purchased quantity or expiry from today's catalog. Defensively filter returned rows by intended user and tenant. Recheck inside each existing mock transaction before payment/grant/booking/audit mutations; disabled UI is not sufficient.

There is an unblocked clear case: a confirmed, remaining, unexpired, nonfrozen multi-class purchase currently permits trial, contrary to PR-04. Fixing that case does not require choosing a new refund, expiry or role policy. Keep the unresolved cases below explicitly represented in the assessment/configuration and report their unverified criteria; do not silently choose a business default or label all PR-04 criteria accepted.

Preserve completed request/review idempotency before reassessing later state: an already completed replay returns its prior result, without another payment/grant/booking/audit. If an existing pending receipt is now ineligible, leave it pending and show a bilingual reason with no writes; its explicit rejection path remains available. Do not invent a refund or automatic rejection. Do not invent uniqueness/reservation rules for multiple still-pending trial requests: approval already rechecks once-only history, and the pending-request policy remains distinct.

## Unresolved meanings and integration contracts

- **Frozen:** current `purchase` and `left` retain a package during freeze, whereas spendable `balance` excludes it. The criterion does not explicitly say whether frozen means active for trial exclusion. Preserve/configure/report that distinction; do not decide it by selecting the more convenient field.
- **Expired and historical:** valid dated expiry uses the existing inclusive comparison; do not extend expired terms or revive spent lots. Unlinked historical grants, no-expiry/malformed rows, nonpurchase gift/adjustment multi-class grants and future-dated records may lack evidence identifying an active purchased package. Keep the known model behavior and ambiguity explicit rather than migrating, dropping or relabeling them.
- **Timing:** the criterion does not specify exclusion on the purchase day versus the chosen future class day. Existing package-spending validity is not proof that trial exclusion uses that same timing rule.
- **Identity:** same-browser user ID is not proof of “once per real person.” Duplicate accounts and cross-device identity need Anu's authoritative contract. Existing trial history must not be cleared or rewritten to solve identity.
- **Cancellation/refunds:** maintain existing repeat-trial history interpretation; do not infer new eligibility from a cancelled booking or introduce future refunds. No legal/purchased-term change is authorized by this review.

## Proposed verification matrix

| Area | Required evidence |
| --- | --- |
| Clear active package | Normal/affiliate package with approved matched payment and remaining classes; trial omitted or unavailable in C-07/C-04/S-04, stale/deep-linked confirm rejected before effects. |
| Lot correctness | Remaining one class of an original multi-class purchase; multiple lots; exact original quantity/expiry retained; unrelated user/tenant rows ignored. |
| Exclusion boundaries | Exhausted, expired, expiry-today, pending/declined payment and prepaid single-only fixtures; no raw-balance false positive. Frozen/unlinked/no-expiry/gift/adjustment/future-dated cases explicitly exercise the preserved/configured unresolved outcome. |
| State changes | Package activates while trial drawer is open or receipt waits for review; fresh staged check prevents activation without changing the pending request. |
| Repeat history | Existing approved trial and historical trial bookings retain existing once-only semantics; no cancellation/refund reinterpretation. |
| Failure/retry | Read, staged-write and local-storage failure leave payment, invoice, ledger, booking, receipt and audit unchanged; retry after resolving the failure succeeds once when eligible. |
| Cancel/late result | Cancel closes the offer/request without new effects; late async completion cannot restore stale eligible UI or navigate. A completed transaction is not silently undone. |
| Idempotency/concurrency | Double submit/retry and concurrent trial/package decisions serialize in the mock; completed decision replay produces no duplicate side effects, even if current eligibility later differs. Changed-intent replay follows existing request conflict rules. |
| Rendered QA | EN/ES,390/1280, light/dark; customer/public and existing authorized/denied desk/review roles. Capture offer, stale/deep-link denial, pending-review refusal, cancellation, read/save error and retry states; verify no horizontal overflow. |
| Release boundaries | Full build, immutable production QA, exact checked commit/CI and ordinary deployment receipt. Keep fixture passes separate from real-person/server enforcement and owner acceptance. |

No external questions or messages were sent. Jas/Justin business clarifications and Anu backend contracts remain separate. This follow-up is ready for the coordinator's integration queue; no implementation has been started.
