import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdtemp,mkdir,rm,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
await mkdir('dist',{recursive:true});
const previous=await readFile('dist/release.json').catch(error=>{if(error.code==='ENOENT')return null;throw error;});const expected=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
try{execFileSync(process.execPath,['scripts/write-release.mjs'],{env:{...process.env,GITHUB_SHA:'f'.repeat(40)}});const actual=JSON.parse(await readFile('dist/release.json','utf8'));assert.equal(actual.sourceCommit,expected,'PR event merge SHA cannot replace actual checked-out source');}finally{if(previous)await writeFile('dist/release.json',previous);else await rm('dist/release.json',{force:true});}
const dir=await mkdtemp(join(tmpdir(),'hoy-release-source-'));
try{await mkdir(join(dir,'dist'));await copyFile('scripts/write-release.mjs',join(dir,'write-release.mjs'));await writeFile(join(dir,'package.json'),JSON.stringify({version:'0.0.0-test',type:'module'}));execFileSync(process.execPath,['write-release.mjs'],{cwd:dir,env:{...process.env,GITHUB_SHA:'a'.repeat(40)}});assert.equal(JSON.parse(await readFile(join(dir,'dist/release.json'),'utf8')).sourceCommit,'a'.repeat(40));console.log('PASS release provenance uses checked-out HEAD over PR synthetic merge; environment fallback outside Git checkout.');}finally{await rm(dir,{recursive:true,force:true});}
