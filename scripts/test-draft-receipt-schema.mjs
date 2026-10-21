// Generate draft artifacts in isolation; never connect to or execute against a database.
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'hoy-draft-schema-'));
try{
 for(const path of ['scripts','src/data','docs','supabase'])await mkdir(join(dir,path),{recursive:true});
 await copyFile('scripts/gen-sql.mjs',join(dir,'scripts/gen-sql.mjs'));await copyFile('src/data/schema.ts',join(dir,'src/data/schema.ts'));
 execFileSync(process.execPath,['--experimental-strip-types','scripts/gen-sql.mjs'],{cwd:dir,stdio:'pipe'});
 const sql=await readFile(join(dir,'supabase/schema.sql'),'utf8');const docs=await readFile(join(dir,'docs/data-model.md'),'utf8');
 assert.match(sql,/create table if not exists public\.transfer_receipts \(/);assert.match(sql,/image_data_url text not null/);assert.match(sql,/alter table public\.transfer_receipts enable row level security;/);assert(!/create policy "transfer_receipts:/.test(sql),'mock receipts receive no client access policy');assert.match(docs,/#### `transfer_receipts`/);
 console.log('PASS isolated draft generator retains receipt contract and RLS/default-deny without client policies; no SQL executed.');
}finally{await rm(dir,{recursive:true,force:true});}
