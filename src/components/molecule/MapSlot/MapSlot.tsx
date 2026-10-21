import { useState } from 'react';
import { Button } from '../../atom/Button/Button';
import { mapEmbedUrl } from './mapLocation';
import { useI18n } from '../../../i18n/I18nProvider';
import { useTable } from '../../../data/DataContext';
import type { MediaAssetRow } from '../../../data/schema';
import type { Bi } from '../../../specs/types';
import { useContact, useSettings } from '../../../modules/admin/settings';
import type { MediaRatio } from '../MediaSlot/MediaSlot';
import './MapSlot.css';

export type MapProvider = 'none' | 'osm' | 'google';

const RATIO_CSS: Record<MediaRatio, string> = {
  '16:9': '16 / 9', '4:3': '4 / 3', '4:5': '4 / 5', '1:1': '1 / 1', '21:9': '21 / 9',
};

const DEFAULTS = {
  open: { es: 'Abrir en Google Maps', en: 'Open in Google Maps' } satisfies Bi,
  heading: { es: 'Dónde estamos', en: 'Where we are' } satisfies Bi,
  load: { es: 'Cargar mapa interactivo', en: 'Load interactive map' } satisfies Bi,
  loading: { es: 'Cargando el mapa…', en: 'Loading map…' } satisfies Bi,
  failed: { es: 'No se pudo cargar el mapa. Usa el enlace de indicaciones o reintenta.', en: 'The map could not load. Use the directions link or retry.' } satisfies Bi,
  fallback: { es: 'Si el mapa no está disponible, abre las indicaciones.', en: 'If the map is unavailable, open directions.' } satisfies Bi,
  problem: { es: '¿El mapa no carga?', en: 'Map not loading?' } satisfies Bi,
  retry: { es: 'Reintentar mapa', en: 'Retry map' } satisfies Bi,
  external: { es: 'El mapa se carga desde {provider} al seleccionarlo.', en: 'The map loads from {provider} when selected.' } satisfies Bi,
};

export interface MapSlotProps {
  /** `'none'` keeps the page offline-safe; `'osm'` and `'google'` embed a live map. Omitted → the M-08f setting (Google for an unsaved choice). */
  provider?: MapProvider;
  ratio?: MediaRatio;
  heading?: Bi | string;
  /** Overrides `tenant.location.label`. */
  address?: Bi | string;
  openLabel?: Bi | string;
  /**
   * Key into `media_assets` (M-02d). Until a map provider is chosen the owner can ship a drawn
   * neighbourhood map through the media library: once that row is `ready` its image fills the
   * frame, and the address line and the deep link stay.
   */
  slotKey?: string;
  className?: string;
}

/**
 * The studio's location, from M-08a (`useContact()`, tenant.ts as the default). `provider="none"` renders a branded
 * placeholder with the address line and a Google Maps deep link — no network request, so
 * screenshots stay offline-safe. Other providers load only on an explicit action; `'osm'` embeds an OpenStreetMap iframe (no API key),
 * `'google'` embeds Google's key-less embed.
 */
export function MapSlot({ provider: providerProp, ratio = '16:9', heading, address, openLabel, slotKey, className = '' }: MapSlotProps) {
  const { bi } = useI18n();
  const [requested, setRequested] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  // 0018: no prop → the M-08f decision; the location is M-08a's (tenant.ts as the default).
  const { settings } = useSettings();
  const contact = useContact();
  const provider = providerProp ?? settings.content.mapProvider;
  const { rows } = useTable<MediaAssetRow>('media_assets', slotKey ? { where: { slot_key: slotKey } } : { limit: 0 });
  const drawn = slotKey ? rows.find((r) => r.status === 'ready' && r.url) : undefined;
  const { lat, lng } = contact.location;
  const head = heading === undefined ? bi(DEFAULTS.heading) : typeof heading === 'string' ? heading : bi(heading);
  const addr = address === undefined ? bi(contact.location.label) : typeof address === 'string' ? address : bi(address);
  const open = openLabel === undefined ? bi(DEFAULTS.open) : typeof openLabel === 'string' ? openLabel : bi(openLabel);
  const mapsHref = contact.location.link ?? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const embed = mapEmbedUrl(provider, lat, lng);
  const active = !!embed && requested === embed && failed !== embed;
  const load = () => { setFailed(null); setLoaded(null); setRequested(embed); };

  return (
    <div className={`mapslot ${active || drawn ? 'has-embed' : 'is-placeholder'} ${className}`}>
      <div className="mapslot-frame" style={{ aspectRatio: RATIO_CSS[ratio] }}>
        {active ? (
          <>
            <iframe key={embed} className="mapslot-embed" src={embed!} title={head} referrerPolicy="no-referrer" onLoad={() => setLoaded(embed)} onError={() => setFailed(embed)} />
            {loaded !== embed && <p className="mapslot-loading small" role="status">{bi(DEFAULTS.loading)}</p>}
          </>
        ) : drawn ? (
          <img className="mapslot-embed" src={drawn.url!} alt={bi(drawn.alt) || head} loading="lazy" />
        ) : (
          <div className="mapslot-empty">
            <span className="mapslot-pin" aria-hidden>◉</span>
            <span className="eyebrow">{head}</span>
            <span className="mapslot-addr">{addr}</span>
          </div>
        )}
      </div>
      {embed && !active && <div className="stack-sm">
        {failed === embed && <p className="small" role="alert">{bi(DEFAULTS.failed)}</p>}
        <Button variant="secondary" onClick={load}>{bi(failed === embed ? DEFAULTS.retry : DEFAULTS.load)}</Button>
        <p className="xs muted">{bi(DEFAULTS.external).replace('{provider}', provider === 'osm' ? 'OpenStreetMap' : 'Google Maps')}</p>
      </div>}
      {active && <div className="stack-sm"><p className="xs muted">{bi(DEFAULTS.fallback)}</p><Button variant="ghost" size="sm" onClick={() => setFailed(embed)}>{bi(DEFAULTS.problem)}</Button></div>}
      <p className="mapslot-links small">
        <a href={mapsHref} target="_blank" rel="noreferrer">{open} ↗</a>
        <span className="muted"> · {lat.toFixed(4)}, {lng.toFixed(4)}</span>
      </p>
    </div>
  );
}
