# App directory and subscriptions

Source: HOY 56a4411; scoped branch feat/app-subscription-directory. Owner: Codex.

Implementation complete in HOY and separate PetRock checkout (base 87837f0). No SantaMaria changes.
Unit/model checks, HOY expense-generator adapter checks, both builds and browser journeys passed.
English/Spanish captures at 390/768/1280/1920/3840 and dark 390/1280 saved with results.
See docs/pages/M-09d.md and PetRock docs/pages/A-28a.md for exact boundaries.

Release: feature PR #46 passed all five CI suites and merged. Post-deploy browser verification runs in the Pages workflow because this workspace proxy blocks github.io; the workflow artifact and deployment tag are the release receipt.
