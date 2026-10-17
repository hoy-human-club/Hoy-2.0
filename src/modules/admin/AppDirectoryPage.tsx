import { subscriptionExpensePreview } from '../../data/subscriptionExpenses';
import { dateKey } from '../../i18n/format';
import { useSession } from '../../auth/SessionProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { tenant } from '../../tenant/tenant';
import { INTEGRATIONS } from './integrationDefs';
import { DirectoryPanel } from '../../shared/subscriptions/DirectoryPanel';
export function AppDirectoryPage() {
  const {can} = useSession();
  const {bi,t,lang} = useI18n();
  return <DirectoryPanel text={s=>t('subscriptions.'+s)} workspaceId={tenant.id} workspaceName={tenant.name} canRead={can('expenses.read')} canWrite={can('expenses.write')} expensePreview={directory=>{
    const now=new Date();const period={start:dateKey(new Date(now.getFullYear(),now.getMonth(),1)),end:dateKey(new Date(now.getFullYear(),now.getMonth()+1,0))};
    const preview=subscriptionExpensePreview(directory,period,[]);
    return <details><summary>{lang==='es' ? 'Vista previa de gastos mensuales COP' : 'Monthly COP expense preview'}</summary><p>{lang==='es' ? 'Usa el generador existente. Solo estimaciones del mes actual; no crea gastos ni marca cargos pagados. Omite otras monedas, intervalos e importes desconocidos.' : 'Uses the existing expense generator. Current-month estimates only; does not create expenses or mark charges paid. Other currencies, intervals and unknown amounts are excluded.'}</p>{preview.drafts.length ? preview.drafts.map(d=><p key={`${d.template_id}|${d.incurred_on}`}>{d.concept} · {d.incurred_on} · COP {d.amount}</p>) : <p>{lang==='es' ? 'Sin estimaciones compatibles para este mes.' : 'No compatible estimates this month.'}</p>}</details>;
  }} candidates={INTEGRATIONS.map(d=>({key:d.key,name:bi(d.name),purpose:bi(d.body)}))} />;
}
