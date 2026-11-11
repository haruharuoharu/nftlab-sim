import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {analyticsSchema, actionBit, CERTIFICATE, LESSONS, referral, reportSql, WALLET} from '../lib/analytics';
import {createAnalyticsClient, CONSENT_KEY} from '../lib/analytics-client';
import {freshProgress, advance} from '../lib/scenarios';

class MemoryStorage {
  values=new Map<string,string>();
  getItem(key:string){return this.values.get(key)??null;}
  setItem(key:string,value:string){this.values.set(key,value);}
  removeItem(key:string){this.values.delete(key);}
  clear(){this.values.clear();}
  key(index:number){return [...this.values.keys()][index]??null;}
  get length(){return this.values.size;}
}
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
test('strict payload rejects identifying extras, unregistered campaigns and simulation wallet events',()=>{
  const event={version:1,id:crypto.randomUUID(),mode:'demo',ref:'note',mask:1};
  assert.equal(analyticsSchema.safeParse(event).success,true);
  for(const extra of [{wallet:'address'},{signature:'tx'},{url:'https://test'},{ref:'person@example.com'},{mask:4096},{mask:3}])
    assert.equal(analyticsSchema.safeParse({...event,...extra}).success,false);
  assert.equal(referral('person@example.com'),'direct');
});
test('opt-in only; excludes historical progress; freezes attribution; resets start a new run',async()=>{
  const storage=new MemoryStorage();const sent:unknown[]=[];let ref='note';
  const client=createAnalyticsClient(storage,async p=>{sent.push({...p});return true;},()=>ref);
  client.start('demo',freshProgress(),false);assert.equal(storage.length,0);
  storage.setItem(CONSENT_KEY,'yes');
  client.start('demo',advance(freshProgress(),'ticket','unlock'),false);assert.equal(storage.length,1);
  client.start('demo',freshProgress(),false);await pause();
  ref='colosseum';client.action('demo','ticket','mint');await pause();
  const last=sent.at(-1) as {id:string;ref:string;mask:number};
  assert.equal(last.ref,'note');assert.equal(last.mask,1|actionBit('ticket','mint'));
  client.reset('demo');client.start('demo',freshProgress(),false);await pause();
  assert.notEqual((sent.at(-1) as {id:string}).id,last.id);
  client.withdraw();const count=sent.length;client.action('demo','ticket','transfer');await pause();assert.equal(sent.length,count);
});
test('rapid events while a request is in flight still send the final cumulative state',async()=>{
  const storage=new MemoryStorage();storage.setItem(CONSENT_KEY,'yes');
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  const sent:number[]=[];
  const client=createAnalyticsClient(storage,async p=>{sent.push(p.mask);if(sent.length===1)await gate;return true;},()=>null);
  client.start('devnet',freshProgress(),true);
  client.action('devnet','ticket','mint');client.certificate('devnet');release();await pause();
  assert.equal(sent.at(-1),1|WALLET|actionBit('ticket','mint')|CERTIFICATE);
});
test('failed sends are retried from storage without making new identifiers',async()=>{
  const storage=new MemoryStorage();storage.setItem(CONSENT_KEY,'yes');const ids:string[]=[];
  const client=createAnalyticsClient(storage,async p=>{ids.push(p.id);throw Error('offline');},()=>null);
  client.start('demo',freshProgress(),false);await pause();await client.flush('demo');
  assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);
});
test('SQLite cohort report separates modes and referrals, includes all-three completion and counts runs once',()=>{
  const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0001_analytics.sql',import.meta.url),'utf8'));
  const insert=db.prepare(`INSERT INTO analytics_journeys VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET mask=analytics_journeys.mask | excluded.mask WHERE analytics_journeys.mode=excluded.mode AND analytics_journeys.ref=excluded.ref`);
  insert.run('a','demo','note',1,'2026-11-11');insert.run('a','demo','note',1|actionBit('ticket','redeem'),'2026-11-12');
  insert.run('a','demo','colosseum',4095,'2026-11-12'); // cannot change first referral
  insert.run('b','devnet','note',1|WALLET|LESSONS|CERTIFICATE,'2026-11-11');
  insert.run('c','devnet','colosseum',1,'2026-11-10');
  const rows=db.prepare(reportSql()).all('2026-11-11','2026-11-11') as Record<string,unknown>[];
  assert.equal(rows.length,2);assert.equal(rows[0].started,1);assert.equal(rows[0].redeemed,1);assert.equal(rows[0].lessonsCompleted,0);
  assert.equal(rows[1].lessonsCompleted,1);assert.equal(rows[1].certificate,1);assert.equal(rows[1].walletConnected,1);db.close();
});
test('blocked browser storage never breaks start, milestone updates or retries',async()=>{
 const storage=new MemoryStorage();storage.getItem=()=>{throw Error('blocked');};
 let sends=0;const client=createAnalyticsClient(storage,async()=>{sends++;return true;},()=>null);
 assert.doesNotThrow(()=>client.start('demo',freshProgress(),false));
 assert.doesNotThrow(()=>client.action('demo','ticket','mint'));
 await assert.doesNotReject(()=>client.flush('demo'));assert.equal(sends,0);
});
