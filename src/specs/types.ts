import type { ReactNode } from 'react';
import type { Role } from '../auth/roles';
import type { ActionDef } from '../actions/types';
import type { IconName } from '../components/atom/Icon/Icon';

/** Bilingual text. Spanish is required; English falls back to Spanish. */
export type Bi = { es: string; en: string };

export type Surface = 'public' | 'customer' | 'teacher' | 'staff' | 'admin' | 'dev' | 'docs';
export type LayoutMode = 'mobile' | 'desktop' | 'auto';

/**
 * The inspector contract. Every routed page carries one of these.
 * `layout` is the ordered list of section/component names the page renders (the layout editor
 * reorders it); `data` are table names from src/data/schema.ts (the inspector links them to the
 * table manager); `logic` are the rules/calculations; `integrations` name external systems.
 */
export interface PageSpec {
  code: string;
  name: Bi;
  purpose: Bi;
  layout: string[];
  data: string[];
  roles: Role[];
  logic: string[];
  integrations: string[];
  states?: string[];
  toggles?: { label: string; on: boolean }[];
  notes?: string[];
  canvasRef?: string;
  /** User story from the canvas, when present. */
  story?: string;
  /** Endpoint sketches from the canvas, when present. */
  api?: string[];
  /** Full layer tree from the canvas (multi-line), when present. */
  layerTree?: string;
  /**
   * What this page can be asked to do (src/actions). Declared here so the whole vocabulary is
   * readable from any page; the page mounts the handlers with `useActions(spec, handlers)`.
   */
  actions?: ActionDef[];
  /** Viewport widths (px) the page has been checked at — phone to 4K TV. */
  checkedAt?: number[];
}

/** A retired path that keeps resolving: the router sends `from` to `to` (replace, query string dropped). No spec, no shell, not in the manifest. */
export interface RedirectDef { from: string; to: string; /** Why it moved, for the changelog and the inspector. */ reason: string }

export type NavBadge = 'beta' | 'preview';

export interface RouteDef {
  path: string;
  element: ReactNode;
  spec: PageSpec;
  roles: Role[];
  surface: Surface;
  layout?: LayoutMode;
  /**
   * When set, the surface's shell shows this route in its navigation (label is an i18n key).
   * `group` is an i18n key too when the dictionary has it, else it renders verbatim.
   * `to` overrides the link target (used when the nav entry should open a parameterised route).
   * `badge` marks a page that is not finished (beta: works, still changing; preview: demo data or a future prototype) —
   * status lives here, never in the label (IA phase 1, 0159).
   * `home` marks a role home candidate (S-01, M-01): the sidebar shows exactly one, the one matching ROLE_HOME, at the top
   * as “Inicio”; the others stay in their group (or hide when they have none).
   */
  nav?: { labelKey: string; icon: IconName; order: number; group?: string; to?: string; badge?: NavBadge; home?: boolean };
}

/** Marks a spec as complete enough for the specs index badge. */
export function specCompleteness(spec: PageSpec): { score: number; missing: string[] } {
  const checks: [string, boolean][] = [
    ['purpose', !!spec.purpose?.es],
    ['layout', spec.layout.length > 0],
    ['data', spec.data.length > 0],
    ['roles', spec.roles.length > 0],
    ['logic', spec.logic.length > 0],
    ['integrations', spec.integrations.length > 0],
    ['states', !!spec.states && spec.states.length > 0],
  ];
  const missing = checks.filter(([, ok]) => !ok).map(([k]) => k);
  return { score: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
}
