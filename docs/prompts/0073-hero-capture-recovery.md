# Hero capture recovery

Source: direct delegation, 2026-10-21.

## Prompt

PR44 https://github.com/imagine-os/hoy/pull/44 is the smallest next change: screenshot extra-width loop inherits dark theme while labeling captures English/light. Main still has this fault. Correct assertions/reset, regenerate captures/19-case report, integrate onto current main without stale version bump. Historical Photography QA38819823902 passed but rerun exact current head.

## Response

Applied the preserved test correction on main 6354f5978baa5689c22d15a411433575d609d8a5. Reset and assert actual language/theme before captures. Preserve v0.25.0 and release SHA generation. See the release receipt for verification status.
