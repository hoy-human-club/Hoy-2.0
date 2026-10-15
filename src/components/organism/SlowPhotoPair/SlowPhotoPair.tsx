import { useI18n } from '../../../i18n/I18nProvider';
import './SlowPhotoPair.css';
/** Non-destructive 40-second dissolve between separately preserved color originals. */
export function SlowPhotoPair({ cool, warm, alt, motion = true, onMotionChange }: {cool:string;warm:string;alt:string;motion?:boolean;onMotionChange?:(motion:boolean)=>void}) {
 const {t}=useI18n();
 return <figure className="slow-photo-pair" data-motion={motion?'on':'off'}>
  <div className="slow-photo-pair-frame"><img src={cool} alt={alt} width={960} height={1440} loading="lazy" decoding="async"/><img className="slow-photo-pair-warm" src={warm} alt="" aria-hidden="true" width={960} height={1440} loading="lazy" decoding="async"/></div>
  <figcaption><span>{alt}</span>{onMotionChange&&<button type="button" onClick={()=>onMotionChange(!motion)} aria-pressed={!motion}>{t(`media.pair.${motion?'pause':'play'}`)}</button>}</figcaption>
 </figure>;
}
