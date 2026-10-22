# Batch 14 — disconnected API response fixtures (IN-04)

IN-04 remains **After Nov 30**, priority Low, source status **Not verified**, source demo status **Simulado / Simulated**. Original criterion remains: “The API responds with a valid key and returns 401 with a revoked key; the full key is shown only once.” This batch does not accept that backend criterion or change the source status.

Baseline inspected: branch `codex/frontend-quote-continuation`, checkpoint `90de752`. Read-only triage preceded implementation. Existing D-0018 (`docs/decisions.md`) expressly assigns verification to the server and rejects browser verification. Existing permissions remain unchanged: super_admin/developer may manage keys; admin reads D-07; other roles cannot enter the route. No scopes, expiry durations, rotation grace, grants, access policies or credentials are configured by this batch.

## Bounded frontend behavior

`/#/dev/api-keys` (D-07) replaces the “Try a request” placeholder with a clearly labeled local, fictional, After Nov30 response simulator. It accepts **symbolic fixture scenarios only**, never a bearer token or generated key. It performs no HTTP/fetch call, hash comparison, key lookup, provider write, `last_used_at` mutation or audit write. The mock endpoint is visibly `MOCK /v1/hours`; returned hours are explicitly fictional and are not studio hours.

Scenarios demonstrate fictional200 for valid, fictional401 for wrong/revoked/expired, and fictional403 for missing read scope. These illustrate response UI, not an approved production security contract. A preparing state can be cancelled/cleared; late timer completion cannot restore the cleared response. An explicitly simulated next-attempt failure returns fictional503, then Retry reruns the fixture successfully. Admin can inspect this read-only simulator without receiving any key-management capability. Real API access remains disconnected.

Existing raw-key issue/show-once behavior is retained unchanged and tested only in an isolated fictional MockProvider context. Raw values must not appear in screenshots, persisted rows, audit bodies, logs or action responses; closing/reloading cannot re-display them. This is not production credential issuance.

## Verification and release evidence

- `scripts/test-api-request-fixture.mjs`: valid/wrong/revoked/expired/scope statuses, failure/retry determinism, invalid scenario rejection, payload independence, explicit disconnected/fixture flags; fetch/storage fail guards prove no network/persistence dependency.
- `scripts/test-api-request-fixture-ui.mjs`: EN/ES390/1280 light/dark, cancel/late result prevention, failure/retry, unchanged full mock database before/after every simulator scenario, existing one-time display hidden after close/reload and absent from persistence, admin read-only, eight denied roles. Images/results under `docs/screenshots/D-07/*api-fixture*`.
- Domain, strict typecheck and integrated full build passed. Final actual rendered QA passed against the immutable production snapshot `http://127.0.0.1:5200` (runtime fingerprint `99aec97228bf…`), EN/ES390/1280 with asserted light/dark, zero page errors. Valid/wrong/revoked/expired/scope responses, repeated-read single current result, busy/cancel/late callback,503/retry, empty network/storage effect spies, unchanged full DB, one-time hide/non-persistence, admin read-only and eight denied roles passed. Canonical D-07 captures were refreshed from final light console captures without raw-key modals. Final checked head/CI/deployment source receipt remains the coordinator's release checkpoint. This is a local production-bundle pass, not live API/server authentication acceptance.

## Separate existing engineering follow-ups (not user-decision blockers)

Source-only findings in existing key management, unchanged here:

- `ApiKeysPage.create` inserts the key row before the separate audit and only then shows the raw value. Audit/storage failure may leave an inserted row without its one-time display. `rotate` separately inserts replacement, updates old expiry and audits; a later failure may leave partial state. A later mock-only staged command could preserve the existing semantics with rollback and retry deduplication; production still needs authorized server commands.
- `onRevoke` awaits revoke without an error handler, while the click deliberately discards the promise. A rejected provider update/audit can produce an unhandled rejection. Local error feedback can be repaired separately.
- WebMCP expiry parsing coerces invalid/negative values to zero/never; unknown nonempty scopes pass the page's length check, then `newKeyRow` filters them to an empty list. Strict draft validation would preserve existing allowed values without inventing new scopes/expiry policy.
- `keyStatus` treats an unparsable expiry as active because NaN comparisons are false. A diagnostic invalid local-row state should be explored without defining real authorization semantics.
- The D-07 role contract says admin is read-only and cannot see `key_hash`; generic table-editor code uses `tables.write` to expose sensitive columns/edit controls, while admin has `tables.write`. This cross-surface source mismatch needs a dedicated role-policy reconciliation; no role/editor grant or access-policy change is made here. No rendered exploit or backend authorization claim is asserted by this source inspection.

## Remaining backend gates

Anu: actual HTTP API, authoritative tenant/environment/scope checks, key hashing and revocation lookup, rate limits, expiry/rotation enforcement, server audit/last-used handling and cross-device tests. Real credentials and security configuration are outside this batch. Owner acceptance stays separate. No external questions/messages sent.

Integration capture correction: fixed test-only full-page scroll/finite-animation artifacts. Captures reset to the top; open payment drawers use the actual viewport. The complete corrected UI script passed again at immutable5200 with zero page errors, preserving all role/no-write/retry checks. Four canonical light captures were refreshed from these final renders and manually inspected. No application CSS or business behavior changed.


Release receipt: [PR62](https://github.com/imagine-os/hoy/pull/62), checked head `fb0c318318714b5b54a0049d9528d091ad815f2e`; all six triggered exact-head workflows passed (control contracts has two jobs). Merge/deployed source `e4257e5bd096898d312cac82f67b6922956c1560`; rollback `fe905a8e0d38705f7a77bfda0234c648d6e7c6ab`. [Pages build/deploy/hosted exact-source verification passed](https://github.com/imagine-os/hoy/actions/runs/39703124987). Hosted proof covers provenance and selected existing flows; this batch’s new behavior remains local-production/exact-head-CI verified, separate from live backend and owner acceptance.
