# 0155 — Coming soon: quick wins

date: 2026-10-23
version: 0.25.0
prompt: docs/prompts/0155-coming-soon-quick-wins.md

- Trigger: design review of W-11 (the public root). It did not say when the studio opens, the lockup was split (a ~90 px hole under the script mark), the headline had no brand moment, Login competed with the language pill, the small text sat on the busy photo, and shared links had no preview.
- Decision:
  - Eyebrow "Abrimos el 30 de octubre / Opening October 30" from the new `tenant.opensOn` (agreed rule RN-01, 2026-10-21), falling back to "Próximamente" after that day. City only in the footer: the street address is still unverified.
  - Headline: the last line in italic and its last word on the sun marker (ink on yellow, slight tilt). Tracking moved to `--ls-tight` so Cormorant's tall acute no longer leans into the "u" of "Muévete".
  - Lockup: the vector wordmark gets an explicit height (as the site header); `aspect-ratio` alone let the inner svg fall back to its 150 px default. Tagline left-aligned under the mark.
  - Login kept (owner request, 0058) as a quiet underlined text link before the language toggle; on phones it stays above the toggle.
  - Deeper ink scrim over the text column and the bottom band.
  - Link previews: og / twitter tags in index.html, absolute through a build-time `%SITE_URL%` (default the GitHub Pages address, `SITE_URL` overrides), and a 1200 × 630 card rendered from W-11 by the new scripts/gen-og-image.mjs (ES default, EN alongside).
- Rejected: removing Login (the owner asked for it); a countdown (not asked, and the date alone carries the message); the raw studio photo as the preview image (no brand, no date); hard-coding the Pages URL in index.html.
- Not in this change: photo grade, lead capture, right-side anchor and the load sequence (the bigger pass; lead capture needs an owner decision on what it collects).
- Tests: scripts/test-website-preview.mjs passes (16 checks, ES/EN, 344 / 390 / 768 / 1280 / 3840); its root path now uses fileURLToPath so it also runs on Windows. W-11 captures regenerated.
- Files: src/components/template/ComingSoonLanding/{ComingSoonLanding.tsx,ComingSoonLanding.css}, src/modules/coming-soon/{strings,specs}.ts, src/tenant/tenant.ts, index.html, vite.config.ts, scripts/gen-og-image.mjs, scripts/test-website-preview.mjs, public/brand/og-coming-soon{,-en}.jpg, docs/pages/W-11.md, docs/screenshots/W-11/*, docs/kanban.md.
