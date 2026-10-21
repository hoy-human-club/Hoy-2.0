# Batch 5 — disconnected Clerk development observation contract

Explicitly authorized exception: prepare the existing Clerk development app adapter/tests separately, with no security configuration changes. This batch does not connect the SDK or change Demo SessionProvider, routing, roles or backend access.

`src/auth/clerkDevelopmentAdapter.ts` records the supplied non-secret development identifiers/configuration and maps observations into loading, signed-out, pending-session, explicit pending-verification, signed-in and sanitized error states. A generic pending session never implies an email-verification requirement. An active session never implies verified email; unknown/unverified values remain explicit. Pending/error states expose no identity. The contract returns no application role, token or backend grant; connected and backendAuthorized remain false.

`clerkIntegrationReadiness` always remains not ready. Production lacks an approved production instance, canonical hosting hostname and explicit access policy; development observations cannot fill those decisions. SDK bridge and server authorization remain unimplemented even if a caller supplies prerequisite strings. No replacement app or guessed production credentials/domain created.

Verification: full build/TypeScript and `scripts/test-clerk-development-adapter.mjs` passed. Deterministic tests cover all observation states, incomplete sessions, separate email verification, sanitized errors, no role/token/backend grant, missing production prerequisites and no network/storage/credential side effects. There is no changed rendered authentication flow to screenshot. Existing EN/ES desktop/mobile application flows remain on the demo provider and are tested separately.

Owner decisions: Justin supplies approved production host/access policy and authorized production instance when ready. Anu integrates SDK observations and authoritative server tenant/role authorization. This prepared contract is not PL-02/PL-04 authentication acceptance. Source status/phase remain unchanged. Exact commit/checks/merge/deployment evidence will be appended after release.
