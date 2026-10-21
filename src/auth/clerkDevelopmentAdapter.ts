/**
 * Prepared, disconnected Clerk boundary. No SDK, storage, network, credentials, role mapping or route changes.
 * A future SDK bridge must explicitly provide these observations; this module does not authenticate anyone.
 * Existing demo SessionProvider remains the running application provider.
 *
 * SDK references checked 2026-10-21:
 * https://clerk.com/docs/js-frontend/reference/types/email-address
 * https://clerk.com/docs/nextjs/reference/types/verification-resource
 * Email verification is a separate observation, never inferred from a session or open signup settings.
 */
export const HOY_CLERK_DEVELOPMENT = Object.freeze({
  appId: 'app_3KTOo6fyzZCbAo3wkKf11EyuJ8w',
  instanceId: 'ins_3KTOo5oYKwGMoVJGH59xy8gJjnT',
  frontendApiHostname: 'heroic-gnu-516.clerk.accounts.dev',
  environment: 'development' as const,
  // Owner-verified current configuration; descriptive only. Do not change security configuration here.
  openSignups: true,
  signupEmailVerificationRequired: false,
  googleCredentials: 'shared-development' as const,
  organizationsEnabled: false,
});

export type EmailVerification = 'verified' | 'unverified' | 'unknown';
export type ClerkAdapterError = 'provider-unavailable' | 'invalid-session-observation';

/** Deliberately excludes email addresses, raw error payloads, session tokens and metadata/roles. */
export interface ClerkObservation {
  isLoaded: boolean;
  userId: string | null;
  sessionId: string | null;
  sessionStatus: 'active' | 'pending' | 'ended' | null;
  emailVerification: EmailVerification;
  /** Bridge must identify a verification task explicitly; pending alone does not explain its cause. */
  pendingTask?: 'verification' | 'other' | 'unknown';
  error?: 'provider-unavailable';
}

interface DisconnectedBoundary {
  provider: 'clerk-development-contract';
  connected: false;
  /** Identity observations never grant access to backend data or application roles. */
  backendAuthorized: false;
}
export type ClerkDevelopmentState = DisconnectedBoundary & (
  | { status: 'loading'; identity: null }
  | { status: 'signed-out'; identity: null }
  | { status: 'pending-verification' | 'pending-session'; identity: null; emailVerification: EmailVerification }
  | { status: 'signed-in'; identity: { userId: string; sessionId: string }; emailVerification: EmailVerification }
  | { status: 'error'; identity: null; code: ClerkAdapterError }
);

const boundary: DisconnectedBoundary = { provider: 'clerk-development-contract', connected: false, backendAuthorized: false };
const validId = (value: string | null): value is string => typeof value === 'string' && value.length > 0 && value.length <= 256 && !/\s/.test(value);

/** Pure, deterministic mapping. A pending session never becomes a usable identity. */
export function observeClerkDevelopment(input: ClerkObservation): ClerkDevelopmentState {
  if (input.error) return { ...boundary, status: 'error', identity: null, code: 'provider-unavailable' };
  if (!input.isLoaded) return { ...boundary, status: 'loading', identity: null };
  if (input.sessionStatus === 'pending') return { ...boundary, status: input.pendingTask === 'verification' ? 'pending-verification' : 'pending-session', identity: null, emailVerification: input.emailVerification };
  if (input.sessionStatus === 'ended' || input.sessionStatus === null && input.userId === null && input.sessionId === null) return { ...boundary, status: 'signed-out', identity: null };
  if (input.sessionStatus !== 'active' || !validId(input.userId) || !validId(input.sessionId)) return { ...boundary, status: 'error', identity: null, code: 'invalid-session-observation' };
  return { ...boundary, status: 'signed-in', identity: { userId: input.userId, sessionId: input.sessionId }, emailVerification: input.emailVerification };
}

export interface ClerkProductionPrerequisites {
  /** All unresolved: caller supplies owner-approved facts only, never guesses from the development instance. */
  instanceId?: string;
  canonicalHostname?: string;
  accessPolicyDecisionId?: string;
}
export type ClerkReadinessBlocker = 'production-instance-unverified' | 'canonical-host-unapproved' | 'access-policy-unapproved' | 'sdk-bridge-disconnected' | 'backend-authorization-unimplemented';

/** Readiness inventory only. Supplying strings cannot enable an integration or authorize backend access. */
export function clerkIntegrationReadiness(environment: 'development' | 'production', production: ClerkProductionPrerequisites = {}): { ready: false; blockers: ClerkReadinessBlocker[] } {
  const blockers: ClerkReadinessBlocker[] = [];
  if (environment === 'production') {
    if (!production.instanceId || production.instanceId === HOY_CLERK_DEVELOPMENT.instanceId) blockers.push('production-instance-unverified');
    if (!production.canonicalHostname || production.canonicalHostname === HOY_CLERK_DEVELOPMENT.frontendApiHostname) blockers.push('canonical-host-unapproved');
    if (!production.accessPolicyDecisionId) blockers.push('access-policy-unapproved');
  }
  blockers.push('sdk-bridge-disconnected', 'backend-authorization-unimplemented');
  return { ready: false, blockers };
}
