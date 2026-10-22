import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'hoy-api-fixture-'));
try{
 const file=join(dir,'fixture.mjs');await build({entryPoints:['src/modules/dev/apiRequestFixture.ts'],bundle:true,platform:'node',format:'esm',outfile:file,logLevel:'silent'});
 const {fictionalApiResponse,API_REQUEST_SCENARIOS}=await import(pathToFileURL(file));
 globalThis.fetch=()=>{throw Error('unexpected network');};globalThis.localStorage={getItem:()=>{throw Error('unexpected storage read');},setItem:()=>{throw Error('unexpected persistence');}};
 for(const [scenario,status] of [['valid',200],['wrong',401],['revoked',401],['expired',401],['scope',403]]){
  const result=fictionalApiResponse(scenario);assert.equal(result.status,status);assert.equal(result.body.fixture,true);assert.equal(result.body.connected,false);assert(!JSON.stringify(result).includes('Bearer'));assert(!JSON.stringify(result).includes('key_hash'));assert(!JSON.stringify(result).includes('last_used_at'));
  assert.equal(fictionalApiResponse(scenario,true).status,503);assert.deepEqual(fictionalApiResponse(scenario),result,'retry returns independent deterministic fixture');
 }
 assert.equal(API_REQUEST_SCENARIOS.length,5);
 for(const value of ['',null,'hoy_test_DO_NOT_ENTER_KEYS','production'])assert.throws(()=>fictionalApiResponse(value),/invalid_fixture_scenario/);
 const a=fictionalApiResponse('valid');a.body.hours.open='changed';assert.equal(fictionalApiResponse('valid').body.hours.open,'10:00');
 console.log('PASS IN-04 symbolic fixture: 200, wrong/revoked/expired401, missing-scope403, failure503/retry, no network/persistence/key verification; independent fictional payloads.');
}finally{await rm(dir,{recursive:true,force:true});}
