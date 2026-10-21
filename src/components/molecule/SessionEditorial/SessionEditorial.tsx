import { useTable } from '../../../data/DataContext';
import type { BaseRow, ClassSessionRow, ModalityRow } from '../../../data/schema';
import { resolveSessionEditorial } from '../../../data/sessionEditorial';
import { useI18n } from '../../../i18n/I18nProvider';
export function SessionEditorial({ session }: { session: ClassSessionRow }) {
 const { bi } = useI18n();
 const { rows: templates } = useTable<BaseRow>('class_templates');
 const { rows: modalities } = useTable<ModalityRow>('modalities');
 const content = resolveSessionEditorial(session, templates.find(t => t.id === session.template_id), modalities.find(m => m.id === session.modality_id));
 const theme = bi(content.theme), description = bi(content.description);
 if (!theme && !description) return null;
 return <div className="stack-sm">{theme && <strong>{theme}</strong>}{description && <p className="small">{description}</p>}</div>;
}
