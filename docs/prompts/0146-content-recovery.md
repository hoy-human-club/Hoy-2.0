# 0146 — Delegated content recovery

> AD-01 and bounded PL-07/PL-10: content failure recovery and atomic FAQ reorder. Own ContentPage.tsx and FaqAdminPage.tsx plus narrowly scoped local commands/tests. Verify failed saves/reorders preserve data and retry does not duplicate or reorder unexpectedly.
>
> Work on imagine-os/hoy from fresh current remote main in your own branch. This is part of Justin's authorized overnight MVP-first FRONTEND completion. Read repository AGENTS.md, relevant .agents/skills SKILL.md files, feature audit and acceptance requirements first. Implement and verify the assigned scope, preserving current design and demo data. Current known deployed main is c21ea3d328be58807719884e5de3fd40a34618a8, but fetch latest.
>
> Concurrent ownership: integration owner handles PR81 payments, shared integration/readiness and final merges. Website owner exclusively handles public Home/Plans/WhatsApp/teacher empty-state fixes. Other workers handle reception, CRM, content and isolated email previews separately. Do not edit shared schema/provider/package/workflow files or another scope without reporting the needed handoff; isolate additions locally when possible. Preserve consent guards, draft/publishing controls, roles and existing data. No credentials, private client notes, customer data, actual authentication, payments, emails, external messages, final domain launch or new services.
>
> Run applicable build, type, domain and browser checks on final code, with real responsive EN/ES interrupted/repeated flows and screenshots where useful. Commit and push scoped non-sensitive source/tests/docs, verify exact remote head, open a draft PR only; do not merge or deploy. If publishing is denied, preserve a patch/bundle and report the exact denial, no bypass or alternate route. Return concrete features/rows, verified vs untested status, PR/head and remaining gaps. Do not count partial rows as complete.

## Response

Implemented local atomic commands and retained draft/retry state for M-02/M-02b, with scoped domain and actual-page browser checks. See [receipt](../frontend-completion/content-recovery.md). Full requirement rows remain partial; integration owner owns shared tracker updates and release.

## Follow-up delegation

> Independent integration review reproduced a P1 in PR82: retry after switching from super-admin to coordinator can commit a payroll edit using old privileges and audit identity. Repair this in your owned content-command scope now; recheck current actor and authorization at execution/retry time and preserve draft safely without committing stale privileges. Add regression tests for role change, actor change, lost acknowledgement and retry, without weakening assertions. Integration owner also says new tests need CI wiring: prepare the precise workflow/package wiring as a separate patch for integration owner rather than editing its owned shared files. Read PR82 review/evidence if available; if reproduction details are missing, reproduce based on the scenario and report the needed specifics. Push the scoped fix to the existing PR82 branch, verify remote head and applicable checks. Do not merge/deploy. This is a repair within Justin's approved overnight frontend work, not a change to real account security settings.

### Follow-up response

Independently reproduced and repaired retained-actor retries; added command and actual-page context regressions. A separate un-applied patch contains the exact CI wiring for the integration owner. See [repair receipt](../frontend-completion/content-recovery-context-repair.md).
