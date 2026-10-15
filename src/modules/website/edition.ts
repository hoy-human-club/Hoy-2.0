import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/** Styling and historical content are separate: classic remains a skin of Latest. */
export type SiteEdition = 'sanctuary' | 'classic';
export type SiteVersion = 'latest' | 'archive' | 'classic' | 'photos';
export const SITE_RELEASE = 'Latest';
export const ARCHIVE_SOURCE = '46beed7274b65fa0d1a500242f4aa76d439afbec';
export const archiveSupports = (path: string) => /^\/site(?:\/(?:about|classes(?:\/[^/]+)?|modalities|teachers|plans))?\/?$/.test(path);
export function useSiteEdition() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const raw = params.get('version');
  // A bare URL always means Latest, even after reviewing an archive in this browser.
  const version: SiteVersion = raw === 'archive' || raw === 'classic' || raw === 'photos' ? raw : 'latest';
  const edition: SiteEdition = version === 'classic' ? 'classic' : 'sanctuary';
  const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
  const videoQuery = params.get('video');
  const motionQuery = params.get('motion');
  const videoEnabled = version !== 'photos' && (videoQuery ?? read('hoy.site.video')) !== 'off';
  const motion = (motionQuery ?? read('hoy.site.motion')) !== 'off';
  useEffect(() => { try { if (videoQuery) localStorage.setItem('hoy.site.video', videoQuery); if (motionQuery) localStorage.setItem('hoy.site.motion', motionQuery); } catch { /* unavailable */ } }, [videoQuery, motionQuery]);
  const setMotion = (on: boolean) => {
    const next = new URLSearchParams(search); next.set('motion', on ? 'on' : 'off');
    navigate({ pathname, search: next.toString() }, { replace: true });
  };
  const setEdition = (next: SiteVersion, video?: boolean) => {
    const query = new URLSearchParams(search); query.set('version', next);
    if (video !== undefined) query.set('video', video ? 'on' : 'off');
    if (next === 'archive') { query.set('motion', 'on'); query.delete('modality'); }
    // Historic and verified class slugs differ; switch at their common index.
    const target = pathname.startsWith('/site/classes/') ? '/site/classes' : next === 'archive' && !archiveSupports(pathname) ? '/site' : pathname;
    navigate({ pathname: target, search: query.toString() });
  };
  return { edition, version, photoEdition: version === 'photos', archived: version === 'archive', setEdition, videoEnabled, motion, setMotion };
}
