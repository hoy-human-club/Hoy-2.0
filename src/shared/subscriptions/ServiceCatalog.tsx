import { SERVICE_CATALOG, type CatalogService } from './catalog';
import type { Directory } from './model';
export function ServiceLogo({service}:{service:CatalogService}) {
 return <img className="service-logo" src={`./brand/services/${service.logo}`} alt={`${service.name} logo`} width="48" height="48" />;
}
export function ServiceCatalog({data,lang,onTrack,canWrite}:{data:Directory;lang:'en'|'es';onTrack:(s:CatalogService)=>void;canWrite:boolean}) {
 const bi=(en:string,es:string)=>lang==='es'?es:en;
 return <section className="service-catalog" aria-label={bi('Public service catalog','Catálogo público de servicios')}>
  <div className="directory-actions"><div><p className="service-eyebrow">{bi('PUBLIC REFERENCE · NOT YOUR BILL','REFERENCIA PÚBLICA · NO ES TU FACTURA')}</p><h2>{bi('The services behind your workspace','Los servicios detrás de tu espacio')}</h2></div><span>{bi('5 services · USD list prices','5 servicios · precios públicos USD')}</span></div>
  <p>{bi('Published plans are reference prices. Your selected plan, account owner and actual charges are recorded separately below. Taxes, usage and regional pricing can change the bill.','Los planes publicados son precios de referencia. Tu plan contratado, responsable y cargos reales se registran por separado abajo. Impuestos, consumo y región pueden cambiar la factura.')}</p>
  <div className="service-grid">{SERVICE_CATALOG.map(service=>{
   const apps=data.dependencies.filter(a=>a.catalogId===service.id);
   const subs=data.subscriptions.filter(s=>apps.some(a=>a.id===s.dependencyId));
   const featured=service.plans.find(p=>p.usd!==null && p.usd>0);
   return <article className="service-card" key={service.id}>
    <div className="service-identity"><ServiceLogo service={service}/><div><h3>{service.name}</h3><span>{service.category[lang]}</span></div></div>
    <p>{service.purpose[lang]}</p>
    <div className="service-price"><span>{featured?.name ?? bi('Public plans','Planes públicos')}</span><strong>{featured ? `USD ${featured.usd!.toFixed(Number.isInteger(featured.usd)?0:2)}` : '—'}</strong><span>{featured?.basis[lang] ?? bi('Verification pending','Verificación pendiente')}</span></div>
    <details><summary>{bi('Published price details','Detalles del precio público')} ({service.plans.length})</summary>{service.plans.map(p=><div className="service-plan" key={p.name}><strong>{p.name} · {p.usd===null?bi('Contact sales','Contactar ventas'):`USD ${p.usd}`}</strong><p>{p.basis[lang]}</p><small>{p.note[lang]}</small></div>)}</details>
    <a href={service.pricingUrl} target="_blank" rel="noreferrer">{bi('Official pricing','Precios oficiales')} ↗</a><small>{bi('Checked','Consultado')}: {service.verifiedOn ?? bi('Pending','Pendiente')}</small>
    <div className="service-workspace"><strong>{bi('Your workspace','Tu espacio')}</strong><p>{bi('Selected plan','Plan contratado')}: {subs.map(s=>s.selectedPlan || bi('Unknown','Desconocido')).join(', ') || bi('Not recorded','Sin registrar')}</p><p>{bi('Account owner','Responsable de cuenta')}: {apps.map(a=>a.accountOwner || bi('Unknown','Desconocido')).join(', ') || bi('Not recorded','Sin registrar')}</p>{canWrite && <button onClick={()=>onTrack(service)}>{apps.length?bi('Review account','Revisar cuenta'):bi('Track service','Registrar servicio')}</button>}</div>
   </article>;
  })}</div>
 </section>;
}
