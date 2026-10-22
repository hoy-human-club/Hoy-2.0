version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# Atomic fictional payroll draft generation

Intent: repair reproduced partial draft persistence and duplicate same-period generation without changing payroll calculation or settlement.

Decision: fresh scoped preparation, atomic one/two-period replacement, approved/paid history guards, safe replay/current-result checks and contained bilingual loading/error/retry/busy/cancel/context acknowledgement handling. Existing calculator/settings/methods/roles and business draft audit actions are retained. Only draft consumers change; no approval, paid/settlement, Wompi, backend, schema or access-policy changes.

Alternative rejected: sequential destructive replacement, captured run/line snapshots, false current-success acknowledgement, implicit historical duplicate migration and treating a mock draft as a real payout.

Files: admin/payrollDraft.ts, usePayrollDraft.ts, payouts.ts generator export, PayoutsPage.tsx draft handlers and strings; three focused test scripts and historical regression fixture; batch30 and M-09a/M-09b screenshots/results. Existing component inventory reused; root owns global metadata/Git/release.

Verification: actual original generator reproduced both bugs; new domain and hook cases passed. Final frozen build/rendered proof follows in batch30. FI-03 original Nov30 delivery remains unaccepted; backend authorization/durability/status locks, real provider and complete lifecycle acceptance remain open. See source reconciliation for separate production/commercial gates.

Local receipt: domain/hook/TypeScript/fullbuild passed; development and initial immutable all8/roles matrices passed with zero pageerrors. Visual review corrected only draft's false “approved, unpaid” badge and legacy “already real” footer; approved/paid branches and financial handlers remain unchanged. Final corrected fullbuild71163 EXIT0, runtime3e03f8eb0c3818bc6c4766a52502f9a4994a2fdeb34c5878ea73fbda52affb60 unchanged through build, immutable5240 ready. Final corrected rendered refresh queued; earlierb6cb matrix is historical. Root exact-head integration/CI/deployment still pending.

Final review additionally reproduced false replay confirmation when a new overlapping draft appears beside an intact recorded result. Post-read now checks the complete affected run-ID set and rejects without writes. Domain/hook reruns passed; new runtime9a149e77bfbf086f4d62dd93e06d6de4f8267790346d31eaa6ed6cae9ca1a81f supersedes3e03/b6cb for final proof. No policy/history change.

Final corrected receipt: fullbuild32710 EXIT0; unchanged runtime9a149e77bfbf086f4d62dd93e06d6de4f8267790346d31eaa6ed6cae9ca1a81f, immutable5240. Exclusive production retry10674 EXIT0 all8 EN/ES390/1280light/dark plus existingroles, zero pageerrors,80 final captures. Source/test/bundle proof M-09a/payroll-draft-proof.json. Prior corrected attempt54106 failed a pointer click during a contemporaneous execution stall; cause unresolved, log/capture preserved, no assertion/source workaround. Inherited390px statement amount wrapping remains a separate visual gap. Root exact-head integration/CI/deployment pending; no full-feature acceptance.
