import './SignupLegalConsent.css';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import type { SignupLegalReference } from '../../../modules/customer/auth/signupLegal';
import { Notice } from '../../molecule/Notice/Notice';
import { Button } from '../../atom/Button/Button';
export interface SignupLegalConsentProps { state:'loading'|'ready'|'error'|'unavailable'|'changed'; documents:SignupLegalReference[]; accepted:boolean; disabled?:boolean; error?:string; onChange:(value:boolean)=>void; onRetry:()=>void }
export function SignupLegalConsent({state,documents,accepted,disabled,error,onChange,onRetry}:SignupLegalConsentProps){
 const {t}=useI18n(),ready=state==='ready'||state==='changed';
 return <section className="stack-sm signup-legal" aria-label={t('customer.signup.legal.title')}>
  {state==='loading'&&<Notice tone="info">{t('customer.signup.legal.loading')}</Notice>}
  {(state==='error'||state==='unavailable')&&<Notice tone="warn" action={<Button type="button" variant="secondary" disabled={disabled} onClick={onRetry}>{t('core.common.retry')}</Button>}>{t(`customer.signup.legal.${state}`)}</Notice>}
  {state==='changed'&&<Notice tone="warn">{t('customer.signup.legal.changed')}</Notice>}
  {ready&&<><p className="small muted">{t('customer.signup.legal.review')}</p><div className="stack-sm">{documents.map(doc=><Link key={doc.kind} className="btn btn-secondary" target="_blank" rel="noopener noreferrer" to={`/site/legal/${doc.kind}?version=${encodeURIComponent(doc.id)}`}>{t(`customer.profile.legal.${doc.kind}`)} · v{doc.version}</Link>)}</div>
  <label className={`auth-consent ${error?'has-error':''}`}><input type="checkbox" checked={accepted} disabled={disabled} onChange={e=>onChange(e.target.checked)}/><span className="small">{t('customer.signup.legal.accept')}</span></label></>}
  {error&&<p className="field-msg field-error" role="alert">{error}</p>}
 </section>;
}
