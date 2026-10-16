import test from 'node:test';import assert from 'node:assert/strict';
import {blankReading,validateReading,status,challengeResult,HOUR,SEEDS} from '../model.js';
const now=Date.now();const record=(extra={})=>({...blankReading(),id:'a',createdAt:now,source:'manual',confirmed:true,ammonia:0,nitrite:0,nitrate:10,ph:8,temp:64,...extra});
test('blank and approximate history never clear readiness',()=>{assert.equal(status([],{},[],now).ready,false);assert.equal(status(SEEDS,{},[],now).gates.filter(g=>g.pass).length,0);assert.throws(()=>validateReading({...blankReading(),createdAt:now,confirmed:true}),/at least one/);});
test('zeroes without a challenge cannot clear move-in',()=>assert.equal(status([record()],{homeChecks:now},[],now).ready,false));
test('fresh per-field observations do not turn null into zero or combine stale data',()=>{const s=status([record({ammonia:1,createdAt:now-25*HOUR}),record({id:'b',ammonia:null})],{},[],now);assert.equal(s.gates[0].pass,false);assert.equal(s.gates[1].pass,true);});
test('1 ppm trial, old checkbox, and late samples cannot pass',()=>{for(const start of [record({ammonia:1,createdAt:now-24*HOUR}),record({ammonia:2,createdAt:now-25*HOUR})])assert.notEqual(challengeResult({readingId:'a',emptyTank:true},[start,record({id:'b'})],[],now).state,'passed');assert.equal(status([record({challenge:true})],{},[],now).ready,false);});
test('real linked challenge passes, interventions before endpoint invalidate it',()=>{const start=record({ammonia:2,createdAt:now-24*HOUR}),end=record({id:'b'}),ch={readingId:'a',emptyTank:true};assert.equal(challengeResult(ch,[start,end],[],now).state,'passed');assert.equal(challengeResult(ch,[start,end],[{kind:'water_change',createdAt:now-HOUR}],now).state,'interrupted');assert.equal(challengeResult(ch,[start,end],[{kind:'water_change',createdAt:now+HOUR}],now+2*HOUR).state,'passed');assert.equal(status([start,end],{challenge:ch,homeChecks:now},[],now).ready,true);});
test('cold, hot, missing, future, and stale readings cannot authorize move-in',()=>{for(const extra of [{temp:null},{temp:45},{temp:70},{ph:null},{nitrate:20},{createdAt:now-25*HOUR},{createdAt:now+HOUR}]){const r=record(extra);assert.equal(status([r],{homeChecks:now},[],now).ready,false);}assert.throws(()=>validateReading(record({createdAt:now+HOUR})),/valid test date/);});
test('occupied tank never presents fishless dosing',()=>{for(const r of [record(),record({ammonia:1}),record({nitrite:2}),record({temp:70}),record({nitrate:80})]){const s=status([r],{movedInAt:now-24*HOUR},[],now);assert.equal(s.stage,'Home');assert.doesNotMatch(s.next+s.detail,/dose|challenge/i);}});
test('current ammonia and nitrite override a previously passed challenge',()=>{
 const start=record({ammonia:2,createdAt:now-24*HOUR}),end=record({id:'b',createdAt:now-HOUR}),settings={challenge:{readingId:'a',emptyTank:true},homeChecks:now};
 for(const extra of [{ammonia:.25},{nitrite:.25}]){
  const s=status([start,end,record({id:'c',...extra})],settings,[],now);
  assert.equal(s.challenge.state,'passed');assert.equal(s.ready,false);
  assert.match(s.detail,/still measurable/);assert.doesNotMatch(s.next,/Finish the water|Final checks complete/);
 }
});
test('current advice priority is ammonia/nitrite, temperature, nitrate, then pH',()=>{
 for(const movedInAt of [undefined,now-HOUR]){
  const settings={movedInAt};
  let s=status([record({ammonia:1,nitrite:1,temp:70,nitrate:80,ph:8.8})],settings,[],now);
  assert.match(s.next,/ammonia|nitrite/i);assert.doesNotMatch(s.next,/pH/);
  s=status([record({temp:70,nitrate:80,ph:8.8})],settings,[],now);assert.match(s.next,/temperature/);
  s=status([record({nitrate:80,ph:8.8})],settings,[],now);assert.match(s.next,/water change/);
  s=status([record({ph:8.8})],settings,[],now);assert.match(s.next,/pH/);
 }
});
test('photo report preloads suggestions, keeps uncertainty explicit and requires one final confirmation',async()=>{
 const {preparePhotoReport,unresolvedBoundaries,confirmReport,eligible}=await import('../model.js');
 const tubes=[['ammonia',[0,.25]],['nitrite',[.25,.5]],['nitrate',[20,40]],['ph',[8.2,8]],['lowPh',[7.6,7.2]]].map(([possibleKey,values])=>({possibleKey,research:{candidates:values.map(value=>({value}))}}));
 const d=preparePhotoReport({...blankReading(),createdAt:now,analysis:{tubes},photo:{}});
 assert.equal(d.ammonia,0);assert.equal(d.nitrite,.25);assert.equal(d.ph,8.2);assert.equal(d.lowPh,null);
 assert.equal(d.confirmed,false);assert.equal(eligible(d),false);assert.throws(()=>confirmReport(d),/Zero or a trace/);
 assert.deepEqual(unresolvedBoundaries(d).map(t=>t.possibleKey),['ammonia']);
 d.decisions.ammonia='accepted';d.nitrate=40;d.decisions.nitrate='corrected';
 const saved=confirmReport(d);assert.equal(saved.confirmed,true);assert.equal(saved.timingConfirmed,true);assert.equal(saved.nitrite,.25);assert.equal(saved.nitrate,40);
 assert.equal(saved.decisions.nitrite,'accepted');assert.equal(saved.decisions.nitrate,'corrected');assert.equal(d.confirmed,false);
 preparePhotoReport(d);assert.equal(d.nitrate,40);assert.equal(d.decisions.nitrate,'corrected');
});
test('unreadable fields stay blank, rejected estimates stay blank, manual input still saves',async()=>{
 const {preparePhotoReport,confirmReport}=await import('../model.js');
 const d=preparePhotoReport({...blankReading(),createdAt:now,analysis:{tubes:[]}});
 assert.equal(d.ammonia,null);assert.throws(()=>confirmReport(d),/at least one/);
 d.nitrite=.5;assert.equal(confirmReport(d).nitrite,.5);
 const old=preparePhotoReport({...blankReading(),createdAt:now,decisions:{nitrite:'declined'},analysis:{tubes:[{possibleKey:'nitrite',research:{candidates:[{value:.25}]}}]}});
 assert.equal(old.nitrite,null);
});
test('missing ammonia does not earn the Almost ready stage',()=>{assert.equal(status([record({ammonia:null,nitrite:.25})],{},[],now).stage,'Cycling');});
test('progress marks every preceding stage complete without marking move-in done',async()=>{
 const {progressStages}=await import('../model.js');
 assert.deepEqual(progressStages('Final challenge').map(s=>s.state),['done','done','current','']);
 assert.deepEqual(progressStages('Move-in').map(s=>s.state),['done','done','done','current']);
});
