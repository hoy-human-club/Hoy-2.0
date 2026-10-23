version: 0.25.0
date: 2026-10-22
codes: C-19 S-03c M-02

# Fictional email change and teacher profile review

Intent: demonstrate explicit email-change confirmation with a previous-address notice preview, and keep teacher bio/specialty proposals pending until authorized review.

Decision: browser-only atomic commands preserve the existing account and published teacher records on failure. Email changes accept fictional .test/.invalid addresses only, require explicit review, and persist a private previous-address notice marked preview-only alongside the account update and compact audit receipt. No auth provider or email delivery is called. Teacher submissions persist separately from published teacher data; teachers can withdraw their own pending proposal, and existing admin/coordinator reviewers can approve or reject with a reason. Approval checks the original published revision and updates only the allowlisted public fields; rates, identity, roles and other fields remain unchanged.

The two new mock contracts are excluded from generic table browsing/editing. Their generated SQL mirror has no client grants (default deny) and is not applied. Authenticated production RPCs remain separate. Alternative rejected: immediate teacher publication, real email/auth changes, or treating a preview as delivered.

Files: shared review commands and scoped loaders, customer profile and teacher profile, content review queue, bilingual panels and component-library examples, mock schema mirrors and focused fictional tests. Detailed delivery receipts and client notes remain local.
