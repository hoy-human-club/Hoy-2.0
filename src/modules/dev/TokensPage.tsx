import { useI18n } from '../../i18n/I18nProvider';
import { useTheme } from '../../design/ThemeProvider';
import { brand, classTones, icons, materials, motion, palette, radii, rgb, semantic, shadows, spacing, spacingSemantic, studio, surfaces, textures, type as typeTokens } from '../../design/tokens';
import { Card } from '../../components/molecule/Card/Card';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { Icon } from '../../components/atom/Icon/Icon';
import './dev.css';

/** D-01 — renders the token object live: palette, semantic roles, materials, textures, the shadow scale, type, spacing, radii, motion. */
export function TokensPage() {
  const { t } = useI18n();
  const { theme, toggleTheme, skin, toggleSkin } = useTheme();
  const sem = semantic[theme];
  const triplets = rgb[theme];
  return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('dev.tokens.title')}</h1><p className="muted small">{t('dev.tokens.body')}</p></div>
        <div className="row"><Toggle checked={theme === 'dark'} onChange={toggleTheme} label={t('core.theme.dark')} /><Toggle checked={skin === 'wireframe'} onChange={toggleSkin} label={t('core.skin.wireframe')} /></div></div>

      <Card title={t('dev.tokens.brand')} eyebrow="HOY 2026 · p8-1"><div className="tok-swatches">{Object.entries(brand).map(([k, v]) => <Swatch key={k} name={`brand-${k}`} value={v} />)}</div></Card>
      <Card title={t('dev.tokens.palette')} eyebrow="canvas --c1 … --c26 · data-brand=&quot;hoy&quot;"><div className="tok-swatches tok-swatches-dense">{Object.entries(palette).map(([k, v]) => <Swatch key={k} name={`hoy-${k}`} value={v} small />)}</div></Card>
      <Card title={t('dev.tokens.semantic', { theme })}><div className="tok-swatches">{Object.entries(sem).filter(([k]) => k.startsWith('color-')).map(([k, v]) => <Swatch key={k} name={k} value={v} live />)}</div></Card>
      <Card title={t('dev.tokens.studio')} eyebrow={`:root[data-look="studio"] · ${theme}`}>
        <div className="tok-swatches">{Object.entries(studio[theme]).map(([k, v]) => <Swatch key={k} name={k} value={v} live />)}</div>
        <div className="tok-grid">{Object.entries(studio.shape).map(([k, v]) => <div key={k} className="tok-row"><code>--{k}</code><span className="xs muted">{v}</span></div>)}</div>
      </Card>
      <Card title={t('dev.tokens.rgb')} eyebrow="canvas --m1 … --m10"><div className="tok-grid">{Object.entries(triplets).map(([k, v]) => <div key={k} className="tok-row"><span className="tok-dot" style={{ background: `rgb(${v})`, width: 16, height: 16 }} /><code>--{k}</code><span className="xs muted">{v}</span></div>)}</div></Card>
      <Card title={t('dev.tokens.tones')} eyebrow="--tone-<id>-fg · -dot · -bg"><div className="tok-swatches">{Object.entries(classTones).map(([k, m]) => <div key={k} className="tok-tone" style={{ background: m.bg, color: m.fg }}><span className="tok-dot" style={{ background: m.dot }} />{k}<code className="xs">{m.dot}</code></div>)}</div></Card>

      <Card title={t('dev.tokens.surfaces')} eyebrow={t('dev.tokens.surfaces.eyebrow')}>
        <div className="tok-surfaces">
          {Object.entries(surfaces).map(([k, s]) => <div key={k} className="tok-swatch"><div className="tok-surface" style={{ background: s.fill, boxShadow: s.shadow, color: k === 'inverse' ? 'var(--color-text-on-inverse)' : undefined }}>{s.label}</div><code className="xs">surfaces.{k}</code><span className="xs muted">{s.fill}</span></div>)}
          <div className="tok-swatch"><div className="tok-frame"><span className="xs muted">{t('dev.tokens.frame')}</span></div><code className="xs">--gradient-frame · --r-phone · --shadow-frame</code><span className="xs muted">{sem['gradient-frame']}</span></div>
        </div>
      </Card>
      <Card title={t('dev.tokens.textures')} eyebrow={t('dev.tokens.textures.eyebrow')}>
        <div className="tok-swatches">
          {Object.keys(textures).map((k) => <div key={k} className="tok-swatch"><div className={`tok-tex tok-${k}`}><span>{k.replace('tex-', '')}</span></div><code className="xs">--{k}</code></div>)}
        </div>
        <p className="xs muted" style={{ marginTop: 'var(--sp-md)' }}>{t('dev.tokens.textures.note')}</p>
      </Card>
      <Card title={t('dev.tokens.materials')} eyebrow={t('dev.tokens.materials.eyebrow')}><div className="tok-swatches">{Object.entries(materials).map(([k, m]) => <div key={k} className="tok-swatch"><span className="tok-swatch-color" style={{ background: `var(--mat-${k})`, height: 72 }} /><code className="xs">--mat-{k}</code><span className="xs muted">{m.label}</span></div>)}</div></Card>

      <Card title={t('dev.tokens.type')}>
        <div className="stack-sm">
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-3xl)', fontWeight: 600, letterSpacing: 'var(--ls-tight)', color: 'var(--color-ink)' }}>Inter — Hoy es un buen día</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-lg)' }}>DM Sans — Un club humano para volver al cuerpo. <em>Énfasis en itálica.</em></div>
          <div className="eyebrow">Eyebrow · 11px · {typeTokens['ls-eyebrow']} · uppercase</div>
          <div className="tok-grid">{Object.entries(typeTokens).filter(([k]) => k.startsWith('fs-')).map(([k, v]) => <div key={k} className="tok-row"><code>--{k}</code><span style={{ fontSize: `var(--${k})`, fontFamily: 'var(--font-heading)' }}>Aa</span><span className="xs muted">{v}</span></div>)}</div>
        </div>
      </Card>
      {/* 0037 · the semantic spacing layer: every value resolves to a scale step; the bar shows the live value at this width */}
      <Card title={t('dev.tokens.spacingSemantic')} eyebrow={t('dev.tokens.spacingSemantic.eyebrow')}>
        <div className="grid grid-2">{Object.entries(spacingSemantic).filter(([k]) => k !== 'measure' && k !== 'row-pad').map(([k, v]) => <div key={k} className="tok-row"><code>--{k}</code><span className="tok-bar" style={{ width: `var(--${k})` }} /><span className="xs muted">{v.replace('var(--', '').replace(')', '')}</span></div>)}</div>
      </Card>
      <div className="grid grid-2">
        <Card title={t('dev.tokens.spacing')}><div className="stack-sm">{Object.entries(spacing).map(([k, v]) => <div key={k} className="tok-row"><code>--{k}</code><span className="tok-bar" style={{ width: v }} /><span className="xs muted">{v}</span></div>)}</div></Card>
        <Card title={t('dev.tokens.radii')}><div className="row wrap">{Object.entries(radii).map(([k, v]) => <div key={k} className="tok-radius" style={{ borderRadius: v }}><code className="xs">{k}</code><span className="xs muted">{v}</span></div>)}</div></Card>
      </div>
      <Card title={t('dev.tokens.shadows')} eyebrow={t('dev.tokens.shadows.eyebrow')}>
        <div className="tok-shadows">
          {Object.keys(shadows).map((k) => <div key={k} className={`tok-shadow ${k === 'shadow-accent' ? 'is-accent' : ''} ${k.startsWith('shadow-pressed') ? 'is-pressed' : ''}`} style={{ boxShadow: `var(--${k})` }}><code className="xs">--{k}</code></div>)}
        </div>
      </Card>
      <Card title={t('dev.tokens.icons')} eyebrow={t('dev.tokens.icons.eyebrow')}><div className="tok-grid">{Object.entries(icons).map(([k, v]) => <div key={k} className="tok-row"><code>--{k}</code>{k.startsWith('icon-stroke') ? <Icon name="schedule" size="lg" strokeWidth={Number(v)} /> : k === 'icon-tile' ? <span className="card-icon"><Icon name="settings" /></span> : <Icon name="schedule" size={k.replace('icon-', '') as 'md'} />}<span className="xs muted">{v}</span></div>)}</div></Card>
      <Card title={t('dev.tokens.motion')}><div className="tok-grid">{Object.entries(motion).map(([k, v]) => <div key={k} className="tok-row"><code>--{k}</code><span className="xs muted">{v}</span></div>)}</div></Card>
    </div>
  );
}

function Swatch({ name, value, live, small }: { name: string; value: string; live?: boolean; small?: boolean }) {
  return (
    <div className="tok-swatch">
      <span className="tok-swatch-color" style={{ background: live ? `var(--${name})` : value, height: small ? 36 : undefined }} />
      <code className="xs">--{name}</code>
      <span className="xs muted">{value}</span>
    </div>
  );
}
