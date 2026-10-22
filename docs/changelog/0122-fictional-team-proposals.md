version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# Fictional team proposals inside existing admin settings

AD-06 gains a separate fictional proposal/membership panel within M-08a. Existing admin/super_admin can preview/cancel/save reserved fixture-only invitations, simulate fixture joining, change canonical Front desk/Admin labels and remove nonlast fixtures. Immediate readback changes only the local example list. No invitation is sent and no actual account, permission, session or Clerk state changes.

Decision: keep one separate actor/tenant/role-scoped document with immutable revision/replay/lifecycle guards. Alternative rejected: writing mock users/user_roles would interfere with sign-in and falsely imply real access administration. Last-admin/self/TTL/resend/existing-account/multiple-role/removal policies remain explicit unresolved previews. Original MVP Oct30/Urgent/SAD01 criterion and real acceptance remain unchanged.

Files: SettingsPage, private teamProposals/useTeamProposals helpers, TeamProposalPanel organism/meta, admin strings, focused tests and batch39/PageM08a evidence. No route/permission definitions, backend schema or shared global metadata changes. Root owns tracker and release. See batch39 for actual checks and pending gates; production/rendered QA not yet claimed.
