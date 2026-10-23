import{createElement as h,useState}from'react';
import{defineMeta}from'../../../design/meta';
import{DemoSignInPanel}from'./DemoSignInPanel';
import{useMockSignIn,makeMockSignIn}from'../../../modules/customer/auth/useMockSignIn';
import type{DemoSignInStatus}from'../../../modules/customer/auth/mockSignIn';
function Example({status='idle'}:{status?:DemoSignInStatus|'wrong'}){
 const[machine]=useState(()=>{const m=makeMockSignIn(),now=Date.now();
  if(status==='google')m.beginGoogle(now);
  else if(['sending','active','expired','locked','failed','complete','wrong'].includes(status)){
   const token=m.beginEmail(now-(status==='expired'?m.policy.validMinutes*60_000:0))!;
   if(status!=='sending')m.finishEmail(token,status==='failed'?null:'123456',now-(status==='expired'?m.policy.validMinutes*60_000:0));
   if(status==='expired')m.tick(now);
   if(status==='locked')for(let i=0;i<m.policy.attempts;i++)m.verify('000000',now);
   if(status==='complete')m.verify('123456',now);
   if(status==='wrong')m.verify('000000',now);
  }return m;});
 const props=useMockSignIn(()=>{},status!=='unavailable',machine);
 return h(DemoSignInPanel,props);
}
const labels={idle:'Inicio',sending:'Preparando',active:'Código activo',expired:'Caducado',locked:'En pausa',google:'Google ficticio',failed:'Error y reintento',complete:'Completado',unavailable:'Desconectado',wrong:'Código incorrecto'};
const states=['idle','sending','active','expired','locked','google','failed','complete','unavailable','wrong']as const;
export default defineMeta({tier:'organism',name:'DemoSignInPanel',description:{es:'Acceso ficticio de cliente con código y simulación de Google, sin credenciales reales.',en:'Fictional customer code sign-in and Google simulation, without real credentials.'},props:[{name:'state / policy / callbacks',type:'DemoSignInState / DemoSignInPolicy / functions',required:true,description:{es:'Estado controlado y configuración demo explícita.',en:'Controlled state and explicit demo configuration.'}}],states:[...states,'wrong code','resend cooldown','cancelled'],usages:states.map(status=>({title:{es:labels[status],en:status},render:()=>h(Example,{status})})),a11y:[{es:'Código con etiquetas, estados anunciados y acciones de cancelar/reintentar.',en:'Labeled code cells, announced states and cancel/retry actions.'}],usedBy:['A-02']});
