version: 0.25.0
date: 2026-10-21
prompt: docs/prompts/0078-contact-map-functionality.md
intent: Continue independent frontend website functionality including SW-07 without waiting for final art.
decision: Reuse keyless MapSlot with explicit load/recovery and permanent directions; default only unsaved provider choice, preserve saved none; validate coordinates without inventing geography.
rejected: Overwriting published or saved choices, claiming fixture maps prove real provider health, introducing API keys/backend services, or waiting for final art to implement functionality.
files: src/components/molecule/MapSlot/*; src/modules/admin/settings.ts; src/modules/website/specs.ts; scripts/test-contact-map*.mjs; .github/workflows/contact-map-qa.yml; docs/pages/W-06.md; docs/screenshots/W-06/*map*; docs/frontend-completion/batch-04.md and manifest.

[Batch evidence](../frontend-completion/batch-04.md). One real Google request failed with ERR_TUNNEL_CONNECTION_FAILED; no retry or bypass, external rendering remains unverified.
