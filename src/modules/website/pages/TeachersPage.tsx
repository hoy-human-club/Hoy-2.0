import { teacherStudioPhoto } from '../photography';
import { useSiteEdition } from '../edition';
import { Fragment, type ReactNode } from 'react';
import { Link } from '../links';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { useTable } from '../../../data/DataContext';
import type { ModalityRow, TeacherRow } from '../../../data/schema';
import { classForModality, classes } from '../../../tenant/brand';
import { Card } from '../../../components/molecule/Card/Card';
import { Chip } from '../../../components/atom/Chip/Chip';
import { MediaSlot } from '../../../components/molecule/MediaSlot/MediaSlot';
import { PageHead, SiteShell } from '../SiteShell';
import { siteSpecs } from '../specs';

/**
 * W-05 — the studio's teachers (0051: the seven real teachers, each with the class they guide). A teacher with no
 * photo_url shows the portrait-pending arch — their initials in the tone of their class — never a generated face,
 * and the public page shows no star rating.
 */
export function TeachersPage() {
  const { edition, photoEdition } = useSiteEdition();
  const { t, lang, bi } = useI18n();
  const { sections, isVisible } = useLayout(siteSpecs.teachers);
  const { rows: teachers } = useTable<TeacherRow>('teachers', { where: { active: true } });
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const spec = (id: string) => {
    const m = modalities.find((x) => x.id === id);
    return { label: m ? (lang === 'es' ? m.name_es : m.name_en) : id, tone: m?.tone ?? ('river' as const), slug: classForModality(m?.slug) };
  };

  const SECTIONS: Record<string, () => ReactNode> = {
    PageHead: () => <PageHead title={t('site.teachers.title')} body={t('site.teachers.body')} />,
    TeacherGrid: () => (
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <p className="xs muted" style={{ marginBottom: 'var(--sp-lg)' }}>{t(photoEdition ? 'site.photos.teacherLegend' : 'site.teachers.legend')}</p>
        <div className="site-teachergrid">
          {teachers.map((te) => {
            const photo = te.photo_url || (photoEdition ? teacherStudioPhoto(te.id) : undefined);
            const first = te.specialties.map(spec)[0];
            const cls = first?.slug ? classes[first.slug] : undefined;
            const initials = te.display_name.split(' ').map((part) => part[0]).slice(0, 2).join('');
            return (
              <Card key={te.id} padding="sm" className="site-teacher">
                {photo
                  ? <MediaSlot ratio={edition === 'sanctuary' ? '4:5' : '4:3'} kind="photo" tone={first?.tone} slotKey="teacher.portrait" src={photo} label={t('site.teachers.portrait', { name: te.display_name })} />
                  : <div className="site-teacher-monogram" data-tone={first?.tone ?? 'river'} role="img" aria-label={`${te.display_name} · ${t('site.new.portraitPending')}`}><span aria-hidden>{initials}</span><small aria-hidden>{t('site.new.portraitPending')}</small></div>}
                <div className="site-teacher-copy">
                  <h3>{te.display_name}</h3>
                  {cls && <p className="site-teacher-line">{bi(cls.tagline)}</p>}
                  <div className="row wrap">{te.specialties.map(spec).map((s) => s.slug
                    ? <Link key={s.label} to={`/site/classes/${s.slug}`}><Chip tone={s.tone} dot>{s.label}</Chip></Link>
                    : <Chip key={s.label} tone={s.tone} dot>{s.label}</Chip>)}</div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    ),
  };

  return (
    <SiteShell>
      {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
    </SiteShell>
  );
}
