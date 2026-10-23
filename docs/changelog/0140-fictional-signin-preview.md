version: 0.25.0
date: 2026-10-22
codes: A-02

# Fictional email-code and Google sign-in preview

Intent: let reviewers exercise customer sign-in behavior without real credentials or provider authorization.

Decision: a fixed fictional customer can enter through a memory-only, single-use email-code challenge or a clearly labeled Google handoff simulation. The existing demo user picker, roles, email/password demo and safe customer return validation are preserved. No free-form address/password is collected by the new panel, no external login is opened and no account, grant or provider record is created. The existing demo settings supply the displayed expiry, resend and lock rules; they do not certify a real authentication policy.

The controller guards duplicate sends, stale completions, exact expiry, old-code reuse, wrong-attempt lock, cancel/unmount and method changes. Resend does not reset wrong attempts; email and Google are blocked until the in-memory lock expires. Google supports cancel, unavailable-account and successful fictional entry. Delivery failure can be previewed without a real send. Invalid settings or a connected provider keep this preview disconnected.

Alternative rejected: activating real OAuth/email integrations or inventing timing values. Those remain separate work.

Files: the sign-in page and bilingual strings, MockSignIn controller/hook, DemoSignInPanel and its component-library examples, focused domain/browser tests. Local verification artifacts and delivery status remain outside public source files.
