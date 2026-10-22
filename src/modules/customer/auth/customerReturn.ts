/** Only destinations already emitted by the public website. This is navigation validation,
 * not authorization; the destination retains its existing role/data guards. */
export function customerReturn(value: string | null | undefined): string | null {
  if (!value || /[\\\s#%]/.test(value)) return null;
  const [path, query = '', extra] = value.split('?');
  if (extra !== undefined) return null;
  const params = new URLSearchParams(query);
  const entries = [...params.entries()];
  if (/^\/app\/checkout\/[A-Za-z0-9_-]+$/.test(path)) {
    if (!entries.length) return path;
    if (entries.length === 1 && entries[0][0] === 'mat' && /^[1-9]\d*$/.test(entries[0][1])) return `${path}?mat=${entries[0][1]}`;
  }
  if (/^\/app\/waitlist\/[A-Za-z0-9_-]+$/.test(path) && !entries.length) return path;
  if (path === '/app/plans') {
    if (!entries.length) return path;
    if (entries.length === 1 && entries[0][0] === 'plan' && /^[A-Za-z0-9_-]+$/.test(entries[0][1])) return `${path}?plan=${entries[0][1]}`;
  }
  if (path === '/app/gift' && !entries.length) return path;
  return null;
}

export function customerAuthLink(path: '/auth/sign-in' | '/auth/sign-up', params: URLSearchParams): string {
  const result = new URLSearchParams();
  const next = customerReturn(params.get('next'));
  if (next) result.set('next', next);
  const invite = params.get('invite');
  if (invite) result.set('invite', invite);
  return `${path}${result.size ? `?${result}` : ''}`;
}
