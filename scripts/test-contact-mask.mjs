import assert from 'node:assert/strict';import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'hoy-contact-mask-'));
try{
 const file=join(dir,'test.mjs');await build({stdin:{contents:"export {maskPhone,personMatches} from './src/modules/staff/people';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:file});
 const {maskPhone:mask,personMatches}=await import(pathToFileURL(file));
 const old=p=>p?p.replace(/(\d{3})\d+(\d{4})$/,'$1 ··· $2'):'—';
 for(const input of ['3001234567','+573001234567','573001234567','12345678','+57 3001234567','57-3001234567','+1.3001234567'])assert.equal(mask(input),old(input),'existing contiguous output preserved');
 for(const input of ['+57 300 123 4567','+57 (300) 123-4567','+57 300.123.4567','+57\u00a0300\u00a0123\u00a04567','+57\u202f300\u202f123\u202f4567'])assert.equal(mask(input),'+57 300 ··· 4567');
 for(const input of ['300 123 4567','(300) 123-4567','300.123.4567',' 3001234567 '])assert.equal(mask(input),'300 ··· 4567');
 for(const input of [null,undefined,'',' ','123','1234567','+57 12345','+57 3001234567 ext9','+57 3001234567 x9','+57 3001234567#9','contact@example.test','unknown raw text','++573001234567','57+3001234567','(300 1234567','300)1234567','((300))1234567','()3001234567','-3001234567','3001234567-','300\n1234567','<b>3001234567</b>','٣٠٠١٢٣٤٥٦٧'])assert.equal(mask(input),'—','unrecognized/short data never returns raw fallback');
 assert.equal(mask(1234567890),'—','runtime nonstring is safe');assert.equal(mask('12345678901234567890'),'123 ··· 7890','all middle digits remain hidden without a new contact-length rule');
 const source='+57 300 123 4567',person={name:'FICTIONAL Mask Contact',email:'fictional-mask@example.test',phone:source};
 assert.equal(old(source),source,'old space-format defect reproduced without screenshots');
 assert.equal(personMatches(person,'+573001234567'),true);assert.equal(personMatches(person,'300 123'),true);assert.equal(personMatches(person,'FICTIONAL'),true);assert.equal(personMatches(person,'not-found'),false);const before=JSON.stringify(person);mask(person.phone);assert.equal(JSON.stringify(person),before,'display leaves search/edit/stored values untouched');
 console.log('PASS contact masking: legacy contiguous output, separators, parentheses, short/null/malformed/extensions fail closed, no raw fallback, unchanged search/source values; display only');
}finally{await rm(dir,{recursive:true,force:true});}
