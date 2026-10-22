// QA-only server: finish dependency preparation before accepting lifecycle-test requests.
// Actual repository config/components/provider are used; production config is unchanged.
import {createServer,optimizeDeps,resolveConfig} from 'vite';
import {readFile} from 'node:fs/promises';
const port=Number(process.env.QA_PORT??5284);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid QA dev port');
const {dependencies}=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const include=[...Object.keys(dependencies),'react-dom/client','react/jsx-runtime','react/jsx-dev-runtime'];
const config={
 optimizeDeps:{include,noDiscovery:true,entries:['index.html','scripts/customer-cancel-harness.html','scripts/customer-cancel-harness.tsx']},
 server:{host:'127.0.0.1',port,strictPort:true},
};
// Public Vite5 API commits optimized metadata; createServer then uses the same config/cache hash.
// noDiscovery prevents a later dynamic harness import from starting a second optimization/reload.
const resolved=await resolveConfig(config,'serve');
const prepared=await optimizeDeps(resolved,process.env.QA_VITE_FORCE==='1');
for(const dependency of include)if(!prepared.optimized[dependency])throw Error('QA dependency not prepared: '+dependency);
console.log('QA dependencies prepared before listen: '+Object.keys(prepared.optimized).sort().join(', '));
const server=await createServer(config);
await server.listen();server.printUrls();
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await server.close();process.exit(0);});
