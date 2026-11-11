import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {actionBit, CERTIFICATE, LESSONS} from '../lib/analytics';
const configPath='.analytics-local.json';
const config=JSON.parse(readFileSync('wrangler.json','utf8'));
config.d1_databases=[{binding:'ANALYTICS_DB',database_name:'nftlab-analytics-test',database_id:'00000000-0000-0000-0000-000000000001'}];
config.vars={...config.vars,ANALYTICS_REPORT_TOKEN:'local-test-only-not-a-production-secret'};
writeFileSync(configPath,JSON.stringify(config));
const cli='node_modules/wrangler/bin/wrangler.js';
let server:ReturnType<typeof spawn>|undefined;let logs='';
const origin='http://127.0.0.1:8790';
try{
 const migration=spawnSync(process.execPath,[cli,'d1','execute','ANALYTICS_DB','--local','--config',configPath,'--command',`DROP TABLE IF EXISTS analytics_journeys; DROP TABLE IF EXISTS communities; DROP TABLE IF EXISTS learning_feedback; ${readFileSync('migrations/0001_analytics.sql','utf8')+readFileSync('migrations/0002_community_feedback.sql','utf8')}`],{encoding:'utf8',timeout:30000,env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
 assert.equal(migration.status,0,migration.stderr);
 server=spawn(process.execPath,[cli,'dev','--local','--config',configPath,'--port','8790'],{stdio:['ignore','pipe','pipe'],env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
 for(const stream of [server.stdout,server.stderr])stream?.on('data',chunk=>{logs=(logs+chunk).slice(-8000);});
 let ready=false;for(let i=0;i<180;i++){try{ready=(await fetch(origin+'/api/analytics')).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,250));}
 assert.ok(ready,logs);
 assert.equal((await (await fetch(origin+'/api/analytics')).json()).enabled,true);
 const post=(body:unknown,requestOrigin=origin)=>fetch(origin+'/api/analytics',{method:'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const event={version:1,id:crypto.randomUUID(),mode:'devnet',ref:'note',mask:1};
 assert.equal((await post(event,'https://other.example')).status,403);
 assert.equal((await post({...event,wallet:'must-not-be-collected'})).status,400);
 assert.equal((await post({padding:'x'.repeat(2000)})).status,413);
 assert.equal((await post(event)).status,200);
 const completed={...event,mask:1|2|LESSONS|CERTIFICATE|actionBit('ticket','mint')};
 assert.equal((await post(completed)).status,200);assert.equal((await post(completed)).status,200);
 assert.equal((await fetch(origin+'/api/analytics/report')).status,401);
 const headers={Authorization:'Bearer local-test-only-not-a-production-secret'};
 assert.equal((await fetch(origin+'/api/analytics/report?from=2026-02-30',{headers})).status,400);
 const report=await fetch(origin+'/api/analytics/report',{headers});assert.equal(report.status,200);assert.equal(report.headers.get('cache-control'),'no-store');
 const data=await report.json();assert.equal(data.rows.length,1);assert.equal(data.rows[0].started,1);assert.equal(data.rows[0].lessonsCompleted,1);assert.equal(data.rows[0].certificateRate,1);
 assert.equal(JSON.stringify(data).includes(event.id),false);

 const admin=(path:string,method='GET',body?:object)=>fetch(origin+path,{method,headers:{...headers,Origin:origin,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 assert.equal((await fetch(origin+'/api/admin/communities')).status,401);
 assert.equal((await fetch(origin+'/api/admin/monthly')).status,401);
 const community={code:'new-group',name:'New group',status:'adopted',adoptedAt:new Date().toISOString().slice(0,10)};
 assert.equal((await admin('/api/admin/communities','PUT',{...community,adoptedAt:null})).status,400);
 assert.equal((await admin('/api/admin/communities','PUT',community)).status,200);
 assert.ok((await (await fetch(origin+'/api/analytics')).json()).referrals.includes('new-group'));
 const feedback={version:1,id:crypto.randomUUID(),mode:'devnet',ref:'new-group',reason:'funding',step:'quiz',locale:'en'};
 for(let i=0;i<2;i++)assert.equal((await fetch(origin+'/api/feedback',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(feedback)})).status,200);
 const month=new Date().toISOString().slice(0,7);
 const monthly=await (await admin('/api/admin/monthly?month='+month+'&ref=new-group')).json();
 assert.equal(monthly.adoptedCommunities,1);assert.equal(monthly.rows.length,2);assert.equal(monthly.rows.find((r:any)=>r.mode==='devnet').feedbackResponses,1);assert.equal(monthly.rows[0].started,0);assert.equal(monthly.rows[0].lessonCompletionRate,null);
 const csv=await admin('/api/admin/monthly?month='+month+'&ref=new-group&format=csv');assert.match(csv.headers.get('content-type')||'',/text\/csv/);assert.equal(csv.headers.get('cache-control'),'no-store');assert.ok(!(await csv.text()).includes('colosseum'));
 console.log('Passed: local Workers + D1 ingestion, deduplication, validation, private report and cohort completion. No remote database or Devnet writes.');
}catch(e){console.error(e);console.error(logs);process.exitCode=1;}
finally{server?.kill('SIGTERM');unlinkSync(configPath);}
