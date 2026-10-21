version: 0.25.0
date: 2026-10-21
prompt: docs/prompts/0074-content-photo-picker.md
intent: Finish preserved Content photo selection through catalog or private browser import.
decision: Recover PR39 picker slice on PR51; wire it into current teacher/photo-slot drafts and preserve explicit save/publication controls.
rejected: Stale dependency hold, overwriting PR50 Content editor, remote upload or committing private captures.
files: src/components/organism/SharedImageField/*; src/data/{localMediaStore,useMediaLibrary,mediaLibrary}.ts; src/modules/admin/{ContentPage,MediaPage}.tsx; src/components/organism/MediaLibrary/MediaLibrary.tsx; src/modules/media/strings.ts; scripts/test-*picker.mjs; .github/workflows/media-picker-qa.yml; docs

# M-02 / M-02d / D-02 release receipt

Baseline and rollback: `8230e05e1436dbf7cad6bfeaca427397d9bc1a77` (v0.25.0). Current release version and release.json provenance retained. PR39's already-merged dependency is excluded from this integration.

Catalog selection, preview, remove/undo and private optimized import update a form draft. Teacher save retains the existing published state. Uploaded copies stay browser-local in tenant-filtered IndexedDB, never in the repository or server. Only JPEG/PNG/WebP with matching signatures are decoded, resized and canvas-reencoded without source metadata. Original files remain with the owner. Remote providers cannot import or select those copies. Private images are not added to build-time catalogs; no schema/credentials/settings changes.

Role-aware placement routing/search from the current release remains intact. Closing the chooser restores keyboard focus. Media slot persistence errors remain visible. PR50 batch, recurrence and pay behavior is preserved.

Catalog-only component captures: [ES390](../screenshots/media-picker/es-390.jpg), [ES1280](../screenshots/media-picker/es-1280.jpg), [EN390](../screenshots/media-picker/en-390.jpg), [EN1280](../screenshots/media-picker/en-1280.jpg). Private-import checks use a synthetic solid-color fixture and never publish its captures.

Local verification passed: full production build/TypeScript/spacing/manual lint; media model/access; Content batch, voucher contract and timetable domain tests; catalog picker selection/remove/undo/invalid upload/private import/tenant isolation/reload; Content teacher draft/cancel/save/reload/publication flag/no network writes; ES/EN390/1280 layout; PR50 Class Schedule/batch/recurrence/pay browser regression; real admin/coordinator/marketing placement navigation; media-library browser matrix; timetable browser matrix. Catalog-only mobile screenshot visually inspected. Voucher browser lifecycle also passed. Exact source head `b29d8733f7bfe1d91c708e3f16fbd18a7f9d913b` passed all eight hosted suites: [picker39678685407](https://github.com/imagine-os/hoy/actions/runs/39678685407), [media library39678685292](https://github.com/imagine-os/hoy/actions/runs/39678685292), [Class Management39678685382](https://github.com/imagine-os/hoy/actions/runs/39678685382), [session availability39678685190](https://github.com/imagine-os/hoy/actions/runs/39678685190), [photography39678685084](https://github.com/imagine-os/hoy/actions/runs/39678685084), [timetable39678685500](https://github.com/imagine-os/hoy/actions/runs/39678685500), [vouchers39678685232](https://github.com/imagine-os/hoy/actions/runs/39678685232), [subscriptions39678685391](https://github.com/imagine-os/hoy/actions/runs/39678685391).

[PR52](https://github.com/imagine-os/hoy/pull/52) merged as `c7171fe9613b30061e33f9b17b36fbf362a5c5f5`. [Pages39679149249](https://github.com/imagine-os/hoy/actions/runs/39679149249) passed build, deploy and live Chromium checks of exact source SHA/v0.25.0, live schedule routes and protected capture exclusions. Live: https://imagine-os.github.io/hoy/. Draft PR39 closed as superseded. Annotated deployment receipt: `deploy-content-photo-picker-2026-10-21`.
