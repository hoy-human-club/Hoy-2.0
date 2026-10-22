// QA-only server: scan the actual dynamically imported drawer harness before lifecycle tests.
// Uses the repository Vite configuration and real components/provider; production config is unchanged.
import {createServer} from 'vite';
const port=Number(process.env.QA_DEV_PORT??5190);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid QA dev port');
const server=await createServer({
 optimizeDeps:{entries:['index.html','scripts/expense-table-harness.html'],force:process.env.QA_VITE_FORCE==='1'},
 server:{host:'127.0.0.1',port,strictPort:true},
});
await server.listen();server.printUrls();
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await server.close();process.exit(0);});
