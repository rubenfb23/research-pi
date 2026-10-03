import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {realDataProtocol,csvProtocol,attachCustomMethod,freezeProtocol,loadFrozen} from '../src/protocol.js';
import {runExperiment,aggregateProject,auditProject,readReceipts,analyzeReceipts} from '../src/experiments.js';
import {draftPaper} from '../src/papers.js';
import {ROOT} from '../src/paths.js';

test('Real-data study executes twenty actual fits, resumes without duplication and links a paper',async()=>{
 const project=mkdtempSync(join(tmpdir(),'repi-real-study-'));
 try {
  const frozen=freezeProtocol(project,realDataProtocol());
  assert.equal((await runExperiment(project)).status,'complete');
  const receipts=readReceipts(project);assert.equal(receipts.length,20);
  assert.equal((await runExperiment(project)).status,'complete');assert.equal(readReceipts(project).length,20);
  const table=aggregateProject(project);assert(table.rows.every(row=>row.metrics.accuracy?.n===10));
  assert.equal(analyzeReceipts(frozen,receipts.slice(1)).status,'incomplete');
  const paper=readFileSync(draftPaper(project).path,'utf8');assert.match(paper,/Wisconsin Diagnostic/);assert.doesNotMatch(paper,/The synthetic dataset/);
 } finally {rmSync(project,{recursive:true,force:true});}
});
test('CSV and frozen custom Python source produce thirty measured runs and detect snapshot changes',async()=>{
 const project=mkdtempSync(join(tmpdir(),'repi-csv-study-'));
 try {
  const csv=join(project,'data.csv');writeFileSync(csv,'a,b,label\n'+Array.from({length:100},(_,i)=>`${i/100},${i%3},${i%2}`).join('\n'));
  let p=csvProtocol(project,{path:csv,target:'label',features:['a','b'],sourceUrl:'https://example.org/fixture',license:'Synthetic test fixture, MIT'});
  p=attachCustomMethod(project,p,join(ROOT,'examples/custom-classifier.py'),'Training-only scaling with seeded SGD');
  freezeProtocol(project,p);
  writeFileSync(csv,'original input changed after snapshot');
  assert.equal((await runExperiment(project)).status,'complete');assert.equal(readReceipts(project).length,30);
  assert(aggregateProject(project).rows.every(row=>row.metrics.accuracy?.n===10));
  assert.match(readFileSync(draftPaper(project).path,'utf8'),/Custom source SHA-256/);
  const method=p.methods.at(-1)!.implementation!;const source=readFileSync(method.path);
  writeFileSync(method.path,'# modified snapshot');assert.throws(()=>loadFrozen(project),/method snapshot changed/);
  writeFileSync(method.path,source);assert.equal(auditProject(project).status,'complete');
  if(p.dataset.kind!=='csv_binary') throw new Error('Wrong dataset');
  writeFileSync(p.dataset.path,'changed');assert.throws(()=>auditProject(project),/dataset snapshot changed/);
 } finally {rmSync(project,{recursive:true,force:true});}
});
test('CSV refuses labels in features, malformed values, nonbinary labels and incomplete seeds',()=>{
 const project=mkdtempSync(join(tmpdir(),'repi-csv-policy-'));
 try {
  const csv=join(project,'data.csv'),opts={path:csv,target:'label',features:['a'],sourceUrl:'https://example.org/fixture',license:'Fixture only'};
  writeFileSync(csv,'a,label\n'+Array.from({length:100},(_,i)=>`${i},${i%2}`).join('\n'));
  assert.throws(()=>csvProtocol(project,{...opts,features:['label']}),/separate feature/);
  writeFileSync(csv,'a,label\n,0\n');assert.throws(()=>csvProtocol(project,opts),/finite numeric/);
  writeFileSync(csv,'a,label\n'+Array.from({length:100},(_,i)=>`${i},${i%3}`).join('\n'));assert.throws(()=>csvProtocol(project,opts),/binary/);
  const p=realDataProtocol();p.trainingSeeds.pop();assert.throws(()=>freezeProtocol(project,p),/ten distinct/);
 } finally {rmSync(project,{recursive:true,force:true});}
});
