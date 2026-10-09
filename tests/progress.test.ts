import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshProgress, advance, canOpen, completed, passQuiz, scenarios } from '../lib/scenarios';
import { progressSchema } from '../lib/validation';
test('later modules remain locked until the prior module is redeemed',()=>{
 let p=freshProgress();assert.equal(canOpen(p,1),false);
 assert.throws(()=>advance(p,'loyalty','unlock'));
 for(const action of ['unlock','mint','transfer'] as const)p=advance(p,'ticket',action);
 assert.equal(canOpen(p,1),false);p=advance(p,'ticket','redeem');assert.equal(canOpen(p,1),true);
});
test('out-of-order and repeated operations are rejected',()=>{
 let p=freshProgress();assert.throws(()=>advance(p,'ticket','redeem'));
 p=advance(p,'ticket','unlock');p=advance(p,'ticket','mint',{asset:'SIM-test'});
 assert.throws(()=>advance(p,'ticket','mint'));assert.equal(p.records.ticket.asset,'SIM-test');
});
test('quiz requires all correct answers; incomplete, sparse, extra or wrong answers fail',()=>{
 for(const s of scenarios){const a=s.questions.map(q=>q.answer);assert.equal(passQuiz(s.id,a),true);assert.equal(passQuiz(s.id,[]),false);assert.equal(passQuiz(s.id,[a[0]]),false);assert.equal(passQuiz(s.id,[...a,0]),false);assert.equal(passQuiz(s.id,[9,9]),false);}
 assert.equal(passQuiz('ticket',Array(2)),false);
});
test('all three scenarios complete and old snapshots remain immutable',()=>{
 let p=freshProgress();const original=p;
 for(const s of scenarios)for(const action of ['unlock','mint','transfer','redeem'] as const)p=advance(p,s.id,action);
 assert.equal(completed(p),3);assert.equal(completed(original),0);
 assert.equal(progressSchema.safeParse(p).success,true);
});
test('corrupted or oversized persistent fields are rejected',()=>{
 assert.equal(progressSchema.safeParse({version:0}).success,false);
 const p=freshProgress();p.records.ticket.asset='x'.repeat(101);
 assert.equal(progressSchema.safeParse(p).success,false);
});
