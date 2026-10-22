// QA-only cold discovery includes the actual lifecycle harness before browser navigation.
// Loads the repository's own Vite config; no application config or production behavior change.
import {createServer} from 'vite';
const port=Number(process.env.QA_PORT??5284);
if(!Number.isSafeInteger(port)||port<1024||port>65535)throw Error('Invalid QA port');
const server=await createServer({optimizeDeps:{entries:['index.html','scripts/customer-cancel-harness.tsx'],force:process.env.QA_VITE_FORCE==='1'},server:{host:'127.0.0.1',port,strictPort:true}});
await server.listen();server.printUrls();
