# Desk receipt customer label — bounded repair

Base: released main `a323426e1e69b5c4f7d384c9ee9143db2e165618`, isolated branch `fix/desk-receipt-customer-20261023`. Source finding: PR83 review5627974067 and TransferQueuePage.tsx. Existing saved candidates are not included or modified.

The actual production page reproduced the defect: the queue displayed a fictional customer's resolved name while the settled receipt displayed “Unknown customer.” The fixture's amount123000, customer ID, one grant and one audit assertions passed. This establishes a label regression, not an amount regression.

The queue already resolves and trims names from the current tenant's profiles. The repair retains that value in ephemeral settled state before the approved payment leaves the pending queue. A null value continues to render the existing localized unknown label. State also retains its provider reference so a provider switch cannot display the previous customer's receipt before passive cleanup; existing actor/effective-role fencing remains.

No name is added to immutable payment facts, audits or historical rows. Receipt previews remain fictional and do not become invoices or delivered email. No settlement/calculation, provider, schema, authentication or policy change is made. Existing receipt/library props and bilingual states are reused.

Verification:

- `test-desk-settlement-customer-ui.mjs`: actual production EN/ES390/1280 named and genuinely missing profiles, including a competing foreign-tenant name; compares queue and receipt names and retained financial/fulfillment facts.
- `test-desk-settlement-customer-context.mjs`: actual queue/component in a development-only harness; interrupted actor/role/provider/unmount, unchanged database on cancellation, and no previous customer in the first layout after provider replacement.
- Existing desk settlement, pending payments, transfer receipts and immutable launch-receipt regressions remain wired. The new suites are added to the read-only exact-head desk-settlement workflow.

Local and hosted results are recorded separately by the integration owner. No unfinished review/CI is a pass; whole feature-row/backend acceptance remains separate.
