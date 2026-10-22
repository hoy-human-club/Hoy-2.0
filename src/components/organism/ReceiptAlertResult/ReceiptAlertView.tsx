import {useI18n} from '../../../i18n/I18nProvider';
import {Button} from '../../atom/Button/Button';
import {Notice} from '../../molecule/Notice/Notice';

export type ReceiptAlertViewMode='loading'|'readError'|'legacy'|'pending'|'preview'|'busy'|'attemptError'|'completed';
/** Shared presentation only: no provider, session, storage, fixtures or dispatch commands. */
export function ReceiptAlertView({receiptId,mode,onRetry,onPreview,onRun,onCancel}:{receiptId:string;mode:ReceiptAlertViewMode;onRetry?:()=>void;onPreview?:()=>void;onRun?:()=>void;onCancel?:()=>void}){
 const {t}=useI18n(),preview=['preview','busy','attemptError'].includes(mode),busy=mode==='busy';
 return <section className="stack" data-receipt-alert="local" data-alert-state={mode} aria-label={t('transfers.alert.title')} style={{overflowWrap:'anywhere'}}>
  <h3>{t('transfers.alert.title')}</h3>
  {!['loading','readError'].includes(mode)&&<p className="small">{t('transfers.alert.saved')} <code>{receiptId}</code></p>}
  <Notice tone="info">{t('transfers.alert.boundary')}</Notice>
  <div aria-live="polite">
   {mode==='loading'?<p role="status">{t('transfers.alert.loading')}</p>:mode==='readError'?<><Notice tone="warn">{t('transfers.alert.readError')}</Notice><Button disabled={!onRetry} onClick={onRetry}>{t('transfers.retry')}</Button></>:mode==='legacy'?<p>{t('transfers.alert.legacy')}</p>:mode==='completed'?<Notice tone="info">{t('transfers.alert.completed')}</Notice>:<>
    <p>{t('transfers.alert.pending')}</p>
    {!preview?<Button variant="outline" disabled={!onPreview} onClick={onPreview}>{t('transfers.alert.preview')}</Button>:<div className="stack">
     <p>{t('transfers.alert.previewBody')}</p>
     {mode==='attemptError'&&<Notice tone="warn">{t('transfers.alert.attemptError')}</Notice>}
     <Button loading={busy} disabled={!onRun} onClick={onRun}>{t(mode==='attemptError'?'transfers.retry':'transfers.alert.run')}</Button>
     <Button variant="ghost" disabled={!onCancel} onClick={onCancel}>{t('transfers.alert.cancel')}</Button>
    </div>}
   </>}
  </div>
 </section>;
}
