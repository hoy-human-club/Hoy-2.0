version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# Fictional team proposals inside existing admin settings

AD-06 gains a separate fictional proposal/membership panel within M-08a. Existing admin/super_admin can preview/cancel/save reserved fixture-only invitations, simulate fixture joining, change canonical Front desk/Admin labels and remove nonlast fixtures. Immediate readback changes only the local example list. No invitation is sent and no actual account, permission, session or Clerk state changes.

Decision: keep one separate actor/tenant/role-scoped document with immutable revision/replay/lifecycle guards. Alternative rejected: writing mock users/user_roles would interfere with sign-in and falsely imply real access administration. Last-admin/self/TTL/resend/existing-account/multiple-role/removal policies remain explicit unresolved previews. Original MVP Oct30/Urgent/SAD01 criterion and real acceptance remain unchanged.

Files: SettingsPage, private teamProposals/useTeamProposals helpers, TeamProposalPanel organism/meta, admin strings, focused tests and batch39/PageM08a evidence. No route/permission definitions, backend schema or shared global metadata changes. Root owns tracker/release.

Current77 source passed fresh fullbuild8889, production55904 all8 EN/ES390/1280lightdark/allroles, and fullD02/roleaddon31784; all EXIT0. Both suites preserve original assertions and add actual footer action viewport bounds. Final representative inspection confirms the private footer wrap repairs the clipped Spanish390 Cancel control. Oldc389 functionalPASS/visualFAIL and its exact before-wrap screenshot stay historical. Prior initialD02timeout cause remains unresolved; fixture-reset diagnosis was separately proven. Only two exact fontCSS URLs use offline QA fixtures, with zero unexpected console/request errors. Canonical M08a images now reflect final77. No shared layout/policy change and no hosted/deployed/criterion acceptance claim. See batch39 and exact source/artifact/capture proof.
