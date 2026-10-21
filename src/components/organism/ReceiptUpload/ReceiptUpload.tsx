import {useRef,useState} from 'react';
import {useI18n} from '../../../i18n/I18nProvider';
import {Button} from '../../atom/Button/Button';
import {Notice} from '../../molecule/Notice/Notice';
import {fictionalReceipt,readReceipt,type ReceiptImage} from '../../../modules/transfers/receipts';
export function ReceiptUpload({value,onChange}:{value:ReceiptImage|null;onChange:(image:ReceiptImage|null)=>void}){
 const {t}=useI18n();const [busy,setBusy]=useState(false),[error,setError]=useState(false);const generation=useRef(0);
 async function read(work:()=>Promise<ReceiptImage>){const version=++generation.current;setBusy(true);setError(false);onChange(null);try{const next=await work();if(version===generation.current)onChange(next);}catch{if(version===generation.current)setError(true);}finally{if(version===generation.current)setBusy(false);}}
 function clear(){generation.current++;setBusy(false);setError(false);onChange(null);}
 return <section className="stack-sm" aria-busy={busy}>
  <Notice tone="warn">{t('transfers.boundary')}</Notice>
  <label className="stack-sm"><span>{t('transfers.upload')}</span><input className="input" type="file" accept="image/png,image/jpeg" onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)void read(()=>readReceipt(file));}} /></label>
  <div className="row wrap"><Button variant="secondary" disabled={busy} onClick={()=>void read(fictionalReceipt)}>{t('transfers.fixture')}</Button>{(value||busy||error)&&<Button variant="ghost" onClick={clear}>{t('transfers.remove')}</Button>}</div>
  {busy&&<p role="status">{t('transfers.loading')}</p>}{error&&<Notice tone="danger">{t('transfers.imageError')}</Notice>}
  {value&&<figure className="stack-sm"><img src={value.dataUrl} alt={t('transfers.preview')} style={{width:'100%',maxWidth:'100%',height:'auto',borderRadius:'var(--r-md)'}}/><figcaption className="small muted">{value.fileName}</figcaption></figure>}
 </section>;
}
