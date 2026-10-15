# 0068 · Media navigation and cached demo clock
version: 0.24.4
date: 2026-10-15
prompt: docs/prompts/0068-media-navigation-demo-clock.md
intent: Repair four reproducible defects in the requested media library and photography QA.
decision: Keep authorization intact, route restricted media placements to clearly labelled public documented previews, search visible Spanish/English placement names, and refresh eligible synthetic full-session fixtures on cached load and sample navigation. Cover source and clock dependencies in Photography QA.
rejected: Expanding customer-route permissions, impersonating content users, English-only search, destructive seed-version resets, changing existing bookings or filling voucher-occupied/over-mat-capacity sessions.
files: MediaLibrary component, metadata, CSS and placement helper; media search model and strings; MockProvider, seed fixture helper and sample route; focused unit/browser checks; media/photography QA workflows; M-02d/C-20 documentation and corrected C-02/C-13/C-18/C-23 runtime-role metadata; generated manifests and package version.

## Verification

- Focused media access/search unit checks pass
- Cached version-10 and already-open provider regression: 37 checks pass across UTC/Bogota, exact-start, weekday/weekend and late-night cases
- Original fresh-seed clock test passes all 14 fixtures
- Existing local booking/CMS/profile rows, cancellations, voucher allocations and valid mat assignments are preserved
- Reviewed source head 4e3b229 passed all five suites, including [Photography/cached-route QA](https://github.com/imagine-os/hoy/actions/runs/38817611324) and [content-role browser QA](https://github.com/imagine-os/hoy/actions/runs/38817611182). Genuine ES/EN mobile/desktop placement captures and both customer cache scenarios are saved and SHA-checked before merge. Exact final-head checks are required before release.

New browser regressions use genuine admin, coordinator and marketing identities and actual link navigation. The sample regression uses the real customer role, a cached morning DB and an already-open provider after advancing the clock. No production-provider synthetic writes are introduced.

**Resumen (ES).** Los enlaces respetan los permisos del rol y ofrecen vistas documentadas cuando hace falta. La búsqueda reconoce Inicio y Próximamente. Las muestras del navegador se mantienen válidas al avanzar el día sin borrar cambios locales.

## Genuine browser captures

![Spanish placement preview, mobile](../screenshots/M-02d/preview-admin-es-390.jpg)
![English placement preview, desktop](../screenshots/M-02d/preview-admin-en-1280.jpg)
![Cached full-class sample, actual customer](../screenshots/C-20/cached-reload-390.jpg)
