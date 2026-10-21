# Batch 4 — contact map functionality (SW-07)

Continues after the confirmed-entitlement batch. Final artwork is not a dependency for existing website functionality. Location is read only from configured published contact settings with tenant.ts fallback; no new address, pin or geographical verification is invented.

The existing keyless Google/OSM MapSlot now loads on explicit request, with bilingual loading, manual recovery/retry and a permanent directions link. An absent provider preference defaults to the existing Google option; saved `none` stays disabled. Finite/range validation accepts valid zero coordinates and rejects invalid coordinate pairs together. Existing draft/publication controls and media settings remain intact. D-02 metadata and W-06 specs describe the new states.

Verification: production build/TypeScript/spacing/manual lint; `scripts/test-contact-map.mjs`; `scripts/test-contact-map-ui.mjs` against local production preview at 5187. EN/ES 390/1280 fixture screenshots cover ready/load/recovery. Tests verify default-vs-saved-none, exact configured coordinates, Google/OSM URLs, accessible frame title, explicit recovery/retry, directions fallback and invalid coordinates. Fixture responses are explicitly test material, not proof that an external map rendered.

Actual-provider blocker: exactly one normal browser GET to `https://www.google.com/maps?q=6.19281,-75.56535&z=15&output=embed`, with no interception, failed `net::ERR_TUNNEL_CONNECTION_FAILED`. No HTTP response or Google frame loaded. No retry or bypass. The request failed in this execution environment; external provider rendering and geographic correctness remain unverified. Evidence: `docs/screenshots/W-06/map-live-attempt.json` and `en-1280-map-live-attempt.jpg`. Cross-origin iframe load/error events do not establish provider health, so recovery is available as an explicit action.

SW-07 stays separate from source/owner acceptance. No backend, keys, credentials, permissions, external messaging or final imagery changes. Exact commit/checked PR/merge/deployment evidence will be appended after release. Roll back using the previous checked main source.
