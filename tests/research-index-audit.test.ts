import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {auditIndexRun,requestEvidenceMatches} from '../src/research-index-audit.js';
import {freezeIndexProtocol,scoreResearchIndex,indexDomains,type IndexEvidence} from '../src/research-index.js';
import {hash,writeJson} from '../src/storage.js';
test('audit verifies native evidence then detects artifact and grade tampering',()=>{
 const root=mkdtempSync(join(tmpdir(),'rai-audit-'));try {
  const protocol=freezeIndexProtocol({schemaVersion:1,version:'audit-fixture',phase:'development',reference:'a',conditions:['a','b'].map(id=>({id,harness:id,model:'mock',provider:'fixture',revision:'test',settings:{}})),tasks:indexDomains.map(domain=>({id:domain,domain,family:domain,inputHash:hash(domain),criteria:['correct'],requiresExpertReview:false})),trials:1,budgets:{seconds:1,requests:1,outputTokens:1},domainWeights:Object.fromEntries(indexDomains.map(d=>[d,.2])) as any,rating:{regularization:.5,tieTolerance:0,bootstrapSamples:100,bootstrapSeed:1},disclosure:'Offline test fixture; not provider traces.'});
  const evidence:IndexEvidence[]=[];let firstWork='';
  for(const t of protocol.tasks)for(const c of protocol.conditions) {
   const path=join(root,t.id+'-'+c.id),work=join(path,'work');mkdirSync(work,{recursive:true});writeFileSync(join(work,'answer.json'),'{}');if(!firstWork)firstWork=work;
   writeFileSync(join(path,'native-trace.jsonl'),'fixture');writeJson(join(path,'requests.json'),[{returnedModel:'mock'}]);
   const files={'answer.json':createHash('sha256').update('{}').digest('hex')};
   const receipt={taskId:t.id,conditionId:c.id,trial:1,protocolHash:protocol.protocolHash,artifactHashes:files,grade:{criteria:{correct:1},valid:true},requestHash:hash([{returnedModel:'mock'}]),traceHash:createHash('sha256').update('fixture').digest('hex')};writeJson(join(path,'receipt.json'),receipt);
   evidence.push({taskId:t.id,conditionId:c.id,trial:1,status:'completed',valid:true,criteria:{correct:1},receiptHash:hash(receipt),artifactHash:hash(files),review:{kind:'automated',notes:'Test fixture.'}});
  }
  writeJson(join(root,'protocol.json'),protocol);writeJson(join(root,'evidence.json'),evidence);writeJson(join(root,'index.json'),scoreResearchIndex(protocol,evidence));
  assert.equal(auditIndexRun(root).status,'verified');
  writeFileSync(join(firstWork,'answer.json'),'tampered');assert.ok(auditIndexRun(root).errors.some(e=>e.includes('Artifact digest')));
  evidence[0]!.criteria.correct=0;writeJson(join(root,'evidence.json'),evidence);assert.ok(auditIndexRun(root).errors.some(e=>e.includes('grading mismatch')));
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('legacy optional-setting reconstruction preserves digests without accepting changed wire values',()=>{
 const original=[{settings:{max_tokens:8192,max_completion_tokens:undefined,temperature:undefined,reasoning_effort:'high',stream:true},status:200}];
 const serialized=JSON.parse(JSON.stringify(original));
 assert.deepEqual(requestEvidenceMatches(serialized,hash(original)),{matched:true,legacyOptionalSettings:true});
 serialized[0].settings.reasoning_effort='low';assert.equal(requestEvidenceMatches(serialized,hash(original)).matched,false);
});
