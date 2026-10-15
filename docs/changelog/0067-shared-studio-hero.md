# 0067 · Shared studio hero
version: 0.24.3
date: 2026-10-15
prompt: docs/prompts/0067-shared-studio-hero.md
intent: Give the regular website the same approved hero background as Coming Soon.
decision: Latest and Photos share the actual red-lit studio image, full-bleed cover layout, dark-blue veil and cream copy. Responsive sources preserve mobile image quality. Retain the regular website content and controls.
rejected: Leaving the regular page on generated concept art, retaining a portrait image in the Photos hero, or overwriting historical Archive/Classic treatments.
files: website HomePage, photography and sanctuary styles, strings and specification; media catalog generator and manifest; photography/media-model/shared-hero regression checks; W-01 documentation and captures; package version.

The voucher UI test now reloads the persisted staff identity before navigating into its guarded admin route, removing a reproduced test-only role-switch race. No runtime role permissions change.

## Before and after

![Previous regular hero](../screenshots/W-01/studio-before-en-1280.jpg)

## Verification

The [hosted photography suite](https://github.com/imagine-os/hoy/actions/runs/38800549013) passed the full build, hub checks, 30 photo captures and 19 shared-hero captures. It covers Latest and Photos in Spanish and English, desktop/mobile and dark mode, narrow/tablet/wide layouts, decoded images, no hero video, cross-edition navigation, CTA targets, Coming Soon image parity and preservation of Archive/Classic. Exact source and capture hashes are checked before release.

![Regular Spanish mobile](../screenshots/W-01/studio-latest-es-390.jpg)
![Regular English desktop](../screenshots/W-01/studio-latest-en-1280.jpg)
![Photos Spanish mobile](../screenshots/W-01/studio-photos-es-390.jpg)
![Photos English desktop](../screenshots/W-01/studio-photos-en-1280.jpg)

**Resumen (ES).** La portada regular y la edición de fotografías comparten la foto real del estudio de la página Próximamente, con velo azul y texto crema legible.
