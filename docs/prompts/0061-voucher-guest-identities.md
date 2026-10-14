# Request

Address the guest-identity review finding in the requested invitation-voucher feature.

Source: https://github.com/imagine-os/hoy/pull/32#discussion_r4274122045

> Duplicate detection should rely only on stable identifiers such as `userId` or email, or otherwise permit repeated display names.

## Response

Removed display names from duplicate identity matching. User IDs remain opaque and namespaced; email identifiers are case-normalized in a separate namespace. Every supplied identifier is checked, including when a participant supplies both an ID and email. Name-only guests can share a display name. No additional guest data is collected, and production integration boundaries are unchanged.
