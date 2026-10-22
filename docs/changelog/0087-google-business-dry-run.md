# 0087 — disconnected Google Business hours dry-run

version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

Intent: continue future IN-03 frontend logic while preserving its original After Nov 30 phase and disconnected Google contract.

Decision: M-10a prepares an immutable local reception-hours/holiday payload, validates local dates/times, and exposes simulated progress, success, fictional error, cancel and retry. An active-run guard prevents duplicate UI starts; changed-source snapshots require re-preparation. Unconfirmed reception hours remain clearly draft. The simulation uses only local timers and in-memory state; no OAuth, fetch, storage writes, configuration changes or sync timestamps. Results clear on reload.

Real Connect/Push controls are visibly disabled. This disconnected route always labels its status Simulated even if a mock integration row says Connected. Existing JSON/text previews remain available, with truthful not-sent wording. No real Google state or external-provider readback is claimed. Weekly reception hours and exceptions retain the existing source contract; no class timetable/policy conflict is resolved by this batch.

Alternative rejected: clicking a pretend provider Push control or marking a local success as a real Google sync. Anu still owns the authorized server/OAuth/PATCH/readback contract. IN-03 remains partial and unaccepted.

Files: GoogleBusinessPage, isolated googleBusinessDryRun domain, scoped admin.gbp strings and M10a spec, domain/UI tests, M-10a captures, batch11. No schema, roles, credentials, account settings or dependencies changed.

Verification: domain tests and existing hours regression pass; targeted TypeScript passes. Rendered dev flow passes actual failure/cancel/retry/duplicate guard and unchanged underlying source/settings checks; final responsive captures and production-bundle checks are recorded in batch11. No hosted deployment claim.

Final dev QA passed at5183 with zero page errors: EN/ES390/1280 light/dark, strict viewport fit, actual local failure/cancel/retry/duplicate-click cases and role denials. A real Spanish mobile Copy JSON header-action overflow was diagnosed (x410 at viewport390) and fixed by moving the control into its own wrapping content row; no shared CSS or clipping. Diagnostics retained, final captures supersede them. Domain, existing hours regression and targeted TypeScript pass. Full integrated build/production QA/exact-head release remain the coordinator’s next gate.

Final local production QA passed on immutable5198 on2026-10-22 UTC with zero page errors, all functional/role/responsive assertions intact. Canonical M-10a EN/ES390/1280 gallery images now match the final production light dry-run renders; final captures visually inspected. Before-fix overflow artifacts are clearly labeled diagnostic history. Hosted Google state/readback remains unverified; checked release evidence belongs to the integration receipt.
