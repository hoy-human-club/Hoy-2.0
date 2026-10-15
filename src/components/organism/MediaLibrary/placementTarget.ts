import { matchPath } from 'react-router-dom';
import type { Role } from '../../../auth/roles';

interface PlacementRoute { path: string; roles: Role[]; spec: { code: string } }
/** Keep route guards intact. Staff can inspect documented screens without impersonating a customer. */
export function placementTarget(path: string, routes: PlacementRoute[], allowed: (roles: Role[]) => boolean): { to: string; documented: boolean } | null {
  const route = routes.find(r => matchPath({ path: r.path, end: true }, path.split('?')[0]));
  if (!route) return null;
  if (allowed(route.roles)) return { to: path, documented: false };
  const docs = routes.find(r => r.path === '/docs/*');
  return docs && allowed(docs.roles) ? { to: `/docs/pages/${route.spec.code.replaceAll('/', '_')}`, documented: true } : null;
}
