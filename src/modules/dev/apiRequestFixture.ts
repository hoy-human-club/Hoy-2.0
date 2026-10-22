/** IN-04 disconnected response fixture. This is NOT API-key verification or authorization.
 * Symbolic scenarios never accept a bearer token, query key hashes or touch a provider.
 */
export const API_REQUEST_SCENARIOS = ['valid', 'wrong', 'revoked', 'expired', 'scope'] as const;
export type ApiRequestScenario = typeof API_REQUEST_SCENARIOS[number];
export interface ApiFixtureResponse { status: 200 | 401 | 403 | 503; body: { fixture: true; connected: false; code: string; hours?: { label: string; open: string; close: string } }; }
export function fictionalApiResponse(scenario: ApiRequestScenario, fail = false): ApiFixtureResponse {
  if (!(API_REQUEST_SCENARIOS as readonly string[]).includes(scenario)) throw Error('invalid_fixture_scenario');
  if (fail) return { status: 503, body: { fixture: true, connected: false, code: 'fictional_temporarily_unavailable' } };
  if (scenario === 'valid') return { status: 200, body: { fixture: true, connected: false, code: 'fictional_ok', hours: { label: 'FICTIONAL / FICTICIO — not studio hours', open: '10:00', close: '11:00' } } };
  if (scenario === 'scope') return { status: 403, body: { fixture: true, connected: false, code: 'fictional_scope_missing' } };
  return { status: 401, body: { fixture: true, connected: false, code: `fictional_${scenario}` } };
}
