import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {communitySchema,feedbackSchema,monthRange,monthlyCsv} from '../lib/community';
import {referral} from '../lib/analytics';
test('adoption needs a real calendar date; only bounded community codes and no extra fields',()=>{
 const c={code:'study-group',name:'Study group',status:'adopted',adoptedAt:'2026-11-11'};
 assert.equal(communitySchema.safeParse(c).success,true);
 for(const p of [{adoptedAt:null},{adoptedAt:'2026-02-30'},{code:'direct'},{code:'a@example.com'},{email:'x'}])assert.equal(communitySchema.safeParse({...c,...p}).success,false);
 assert.equal(referral('study-group',['direct','study-group']),'study-group');assert.equal(referral('unknown',['direct','study-group']),'direct');
});
test('feedback rejects free text, identifying fields and unknown choices',()=>{
 const f={version:1,id:crypto.randomUUID(),mode:'demo',ref:'note',reason:'funding',step:'quiz',locale:'ja'};
 assert.equal(feedbackSchema.safeParse(f).success,true);
 for(const extra of [{reason:'my email is'},{wallet:'address'},{comment:'hello'},{mode:'mainnet'}])assert.equal(feedbackSchema.safeParse({...f,...extra}).success,false);
});
test('calendar month boundaries and zero-denominator CSV are safe',()=>{
 assert.deepEqual(monthRange('2028-02'),{from:'2028-02-01',to:'2028-02-29'});assert.deepEqual(monthRange('2026-12'),{from:'2026-12-01',to:'2026-12-31'});
 for(const month of ['2026-13','2026-1','2026-02-30','x'])assert.throws(()=>monthRange(month));
 const csv=monthlyCsv([{month:'2026-11',name:'=IMPORTDATA("x")',started:0,lessonCompletionRate:null}]);assert.ok(csv.includes("\"'=IMPORTDATA"));assert.ok(csv.includes('"0"'));assert.ok(!csv.includes('NaN'));
});
test('migrations keep link-only activity separate from adoption and feedback retries idempotent',()=>{
 const db=new DatabaseSync(':memory:');for(const file of ['0001_analytics.sql','0002_community_feedback.sql'])db.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
 db.prepare('INSERT INTO analytics_journeys VALUES(?,?,?,?,?)').run('a','demo','note',4093,'2026-11-11');
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM communities WHERE status='adopted'").get()?.n,0);
 const insert=db.prepare('INSERT INTO learning_feedback(id,mode,ref,reason,step,locale) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING');insert.run('x','demo','note','terms','quiz','ja');insert.run('x','demo','note','terms','quiz','ja');assert.equal(db.prepare('SELECT COUNT(*) AS n FROM learning_feedback').get()?.n,1);
 db.prepare("UPDATE communities SET status='adopted',adopted_at='2026-11-11' WHERE code='note'").run();assert.equal(db.prepare("SELECT COUNT(*) AS n FROM communities WHERE status='adopted'").get()?.n,1);db.close();
});
