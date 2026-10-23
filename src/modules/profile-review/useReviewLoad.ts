import{useEffect,useState}from'react';
import type{DataProvider}from'../../data/types';
export function useReviewLoad<T>(data:DataProvider,key:string,tables:string[],read:()=>Promise<T>){
 const[retry,setRetry]=useState(0),[state,setState]=useState<{key:string;data:DataProvider;status:'loading'|'ready'|'error';value:T|null}>({key:'',data,status:'loading',value:null});
 const names=tables.join('|');
 useEffect(()=>{let active=true,epoch=0;const load=async()=>{const n=++epoch;setState(v=>({...v,key,data,status:'loading'}));try{const value=await read();if(active&&epoch===n)setState({key,data,status:'ready',value});}catch{if(active&&epoch===n)setState({key,data,status:'error',value:null});}};void load();const stops=names.split('|').map(table=>data.subscribe(table,()=>void load()));return()=>{active=false;stops.forEach(stop=>stop());};},[data,key,names,read,retry]);
 return{...(state.key===key&&state.data===data?state:{key,data,status:'loading' as const,value:null}),retry:()=>setRetry(n=>n+1)};
}
