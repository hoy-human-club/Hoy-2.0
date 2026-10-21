# Content photo picker recovery

Source: direct delegation, 2026-10-21; preserved original request in PR39.

## Prompt

It looks like were not able to select photos from content. they should be selectable from media library or from uploading

PR39 https://github.com/imagine-os/hoy/pull/39 reusable SharedImageField/photo picker is not on main. Old PR36 dependency hold is superseded because PR36/37 merged October15. Integrate after fresh QA44, verify Content after PR50 and picker/media/voucher/timetable regressions. Keep uploaded photos browser-local/private; no private file uploads to repository or public hosting.

## Response

Recovered the picker-only changes onto current main after checked PR51. Connected teacher photo and photo-slot drafts; preserved batch/recurrence/pay/save-error handling. Browser-private optimized copies stay in IndexedDB and the mock provider. Role-safe placement links and keyboard return focus retained. No original uploads, credentials or backend connections. See the release receipt for verification.
