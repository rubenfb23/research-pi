import test from 'node:test';
import assert from 'node:assert/strict';
import {freezeIndexProtocol,scoreResearchIndex,renderIndexReport,indexDomains,type IndexEvidence} from '../src/research-index.js';
import {hash} from '../src/storage.js';
function fixture(phase:'development'|'holdout'='development',families=1,trials=1) {
 const protocol=freezeIndexProtocol({schemaVersion:1,version:'test-v1',phase,reference:'baseline',conditions:['baseline','candidate'].map(id=>({id,harness:id,model:'same-model',provider:'fixture',revision:'test',settings:{thinking:'medium'}})),tasks:indexDomains.flatMap(domain=>Array.from({length:families},(_,i)=>({id:domain+i,domain,family:domain+i,inputHash:hash(domain+i),criteria:['correct','supported'],requiresExpertReview:domain==='scientific_writing'}))),trials,budgets:{seconds:120,requests:10,outputTokens:4096},domainWeights:Object.fromEntries(indexDomains.map(d=>[d,.2])) as any,rating:{regularization:.5,tieTolerance:.01,bootstrapSamples:100,bootstrapSeed:42},disclosure:'Synthetic test fixture, never a model evaluation.'});
 const evidence:IndexEvidence[]=protocol.tasks.flatMap(t=>protocol.conditions.flatMap(c=>Array.from({length:trials},(_,i)=>({taskId:t.id,conditionId:c.id,trial:i+1,status:'completed' as const,valid:true,criteria:{correct:1,supported:1},receiptHash:hash([t.id,c.id,i]),artifactHash:hash('artifact'),review:{kind:'automated' as const,notes:'fixture'}}))));
 return {protocol,evidence};
}
test('a fully saturated suite stays tied at 50 with visible perfect raw scores',()=>{
 const {protocol,evidence}=fixture();const r=scoreResearchIndex(protocol,evidence);
 assert.equal(r.saturated,true);assert.equal(r.publishable,false);
 assert.ok(r.rows.every(row=>row.developmentRating===50&&row.scientificQuality===100&&row.rai===null));
 assert.match(renderIndexReport(r),/saturated/);assert.match(renderIndexReport(r),/Development calibration only/);
});
test('consistent wins yield a finite sub-100 rating and preserve anchor 50',()=>{
 const {protocol,evidence}=fixture();for(const e of evidence)if(e.conditionId==='baseline')e.criteria={correct:0,supported:0};
 const r=scoreResearchIndex(protocol,evidence),c=r.rows.find(r=>r.id==='candidate')!;
 assert.ok(c.developmentRating!>50&&c.developmentRating!<100);assert.equal(r.rows.find(r=>r.id==='baseline')!.developmentRating,50);
 assert.equal(r.sameModelHarnessLift[0]!.deltaQualityPoints,-100);assert.equal(c.interval95,null);
});
test('holdout cannot publish while required blinded expert review is pending',()=>{
 const {protocol,evidence}=fixture('holdout');assert.equal(scoreResearchIndex(protocol,evidence).status,'awaiting_expert_reviews');
 for(const e of evidence)e.review={kind:'independent_expert',reviewerId:'external-reviewer',blinded:true,notes:'Attested fixture only.'};
 const result=scoreResearchIndex(protocol,evidence);assert.equal(result.publishable,true);assert.ok(result.rows.every(r=>r.rai===50));
});
test('incomplete attempts or domains are unranked, not silently renormalized',()=>{
 const {protocol,evidence}=fixture();assert.equal(scoreResearchIndex(protocol,evidence.slice(1)).rows[0]!.developmentRating,null);
 const {protocolHash,...body}=protocol;body.tasks=body.tasks.filter(t=>t.domain!=='literature');const p=freezeIndexProtocol(body);
 const r=scoreResearchIndex(p,evidence.filter(e=>p.tasks.some(t=>t.id===e.taskId)));
 assert.deepEqual(r.missingDomains,['literature']);assert.equal(r.rows[0]!.scientificQuality,null);
});
test('invalid science and failed attempts cannot receive credit for presentation',()=>{
 const {protocol,evidence}=fixture();for(const e of evidence)if(e.conditionId==='candidate')e.valid=false;
 assert.equal(scoreResearchIndex(protocol,evidence).rows.find(r=>r.id==='candidate')!.scientificQuality,0);
 for(const e of evidence)if(e.conditionId==='candidate'){e.valid=true;e.status='failed';}
 assert.equal(scoreResearchIndex(protocol,evidence).rows.find(r=>r.id==='candidate')!.scientificQuality,0);
});
test('reject tampered protocol, duplicate and unplanned evidence, missing criteria, nonfinite scores',()=>{
 const {protocol,evidence}=fixture();assert.throws(()=>scoreResearchIndex({...protocol,reference:'candidate'},evidence),/hash mismatch/);
 assert.throws(()=>scoreResearchIndex(protocol,[...evidence,evidence[0]!]),/Duplicate/);
 for(const mutation of [{trial:2},{criteria:{correct:NaN,supported:1}},{criteria:{correct:1}},{taskId:'unknown'},{costUsd:-1}])assert.throws(()=>scoreResearchIndex(protocol,[{...evidence[0]!,...mutation} as IndexEvidence,...evidence.slice(1)]));
});
test('family bootstrap is reproducible, retains pairing and returns finite intervals',()=>{
 const {protocol,evidence}=fixture('development',3,2);
 for(const e of evidence)if(e.conditionId==='candidate')e.criteria={correct:e.taskId.endsWith('0')?0:1,supported:1};
 const a=scoreResearchIndex(protocol,evidence),b=scoreResearchIndex(protocol,evidence);
 assert.deepEqual(a,b);assert.ok(a.rows.every(r=>r.interval95?.every(x=>x>0&&x<100)));
});
test('HTML escapes submitted reviewer text and identifiers',()=>{
 const {protocol,evidence}=fixture();evidence[0]!.review.notes='<script>alert(1)</script>';
 assert.ok(!renderIndexReport(scoreResearchIndex(protocol,evidence)).includes('<script>'));
});
