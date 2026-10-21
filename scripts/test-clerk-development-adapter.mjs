// Disconnected contract tests. No Clerk account requests, SDK import, credentials or config mutations.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'hoy-clerk-contract-'));
try {
 const file=join(dir,'adapter.mjs');await build({entryPoints:['src/auth/clerkDevelopmentAdapter.ts'],bundle:true,platform:'node',format:'esm',outfile:file});
 const {HOY_CLERK_DEVELOPMENT:dev,observeClerkDevelopment:observe,clerkIntegrationReadiness:readiness}=await import(pathToFileURL(file));
 assert.equal(dev.appId,'app_3KTOo6fyzZCbAo3wkKf11EyuJ8w');assert.equal(dev.instanceId,'ins_3KTOo5oYKwGMoVJGH59xy8gJjnT');assert.equal(dev.frontendApiHostname,'heroic-gnu-516.clerk.accounts.dev');
 assert.equal(dev.signupEmailVerificationRequired,false);assert.equal(dev.googleCredentials,'shared-development');assert.equal(dev.organizationsEnabled,false);
 const empty={isLoaded:true,userId:null,sessionId:null,sessionStatus:null,emailVerification:'unknown'};
 assert.equal(observe({...empty,isLoaded:false}).status,'loading');assert.equal(observe(empty).status,'signed-out');
 const active={...empty,userId:'user_qa_fictional',sessionId:'sess_qa_fictional',sessionStatus:'active'};
 const signedIn=observe(active);assert.equal(signedIn.status,'signed-in');assert.deepEqual(signedIn.identity,{userId:active.userId,sessionId:active.sessionId});assert.equal(signedIn.emailVerification,'unknown','active session never invents email verification');
 assert.equal(observe({...active,emailVerification:'unverified'}).emailVerification,'unverified','existing dev open signup policy is observed, not silently rewritten');
 assert.equal(observe({...active,emailVerification:'verified'}).emailVerification,'verified');
 const pending=observe({...active,sessionStatus:'pending',pendingTask:'verification',emailVerification:'unverified'});assert.equal(pending.status,'pending-verification');assert.equal(pending.identity,null);assert.equal(observe({...active,sessionStatus:'pending'}).status,'pending-session','pending status alone never invents a verification requirement');
 for(const incomplete of [{...active,userId:null},{...active,sessionId:null},{...active,sessionStatus:null},{...active,userId:'bad id'}]){assert.equal(observe(incomplete).status,'error');assert.equal(observe(incomplete).identity,null);}
 const error=observe({...active,error:'provider-unavailable'});assert.equal(error.status,'error');assert.equal(error.identity,null);assert.equal(error.code,'provider-unavailable');
 assert.equal(observe({...active,sessionStatus:'ended'}).status,'signed-out');
 for(const observation of [empty,active,{...active,isLoaded:false},{...active,sessionStatus:'pending'},{...active,error:'provider-unavailable'}]){const state=observe(observation);assert.equal(state.backendAuthorized,false);assert.equal(state.connected,false);assert(!('role' in state));assert(!('token' in state));}
 assert.deepEqual(readiness('production').blockers,['production-instance-unverified','canonical-host-unapproved','access-policy-unapproved','sdk-bridge-disconnected','backend-authorization-unimplemented']);
 assert.equal(readiness('production',{instanceId:dev.instanceId,canonicalHostname:dev.frontendApiHostname}).ready,false);
 assert.deepEqual(readiness('development'),{ready:false,blockers:['sdk-bridge-disconnected','backend-authorization-unimplemented']});
 assert.equal(readiness('production',{instanceId:'ins_qa_supplied',canonicalHostname:'qa-owner-approved.example.test',accessPolicyDecisionId:'qa-decision'}).ready,false,'prerequisite strings never enable live auth or backend access');
 assert.equal(JSON.stringify(observe(active)),JSON.stringify(observe(active)),'deterministic input/output');
 const source=await readFile('src/auth/clerkDevelopmentAdapter.ts','utf8');assert(!/sk_(?:test|live)_|pk_(?:test|live)_|Bearer\s+[A-Za-z0-9]/.test(source),'no credential values');assert(!/\bfetch\s*\(|localStorage|sessionStorage|document\.|window\./.test(source),'no runtime side effects');
 console.log('PASS disconnected Clerk development contract: known instance, loading/signed-out/pending/error/identity, email verification preserved, no roles/backend grant, production prerequisites blocked, no credentials or side effects');
} finally {await rm(dir,{recursive:true,force:true});}
