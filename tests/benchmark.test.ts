import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {benchTasks,gradeAnswer,parseAnswer,runBenchmark,auditBenchmark} from '../src/benchmark.js';
import {doctor} from '../src/doctor.js';

test('Benchmark reference infrastructure executes 200 trials; wrong answers are rejected',async()=>{
 const project=mkdtempSync(join(tmpdir(),'repi-bench-'));
 try {
  const tasks=benchTasks();assert.equal(tasks.length,20);assert.equal(new Set(tasks.map(t=>t.id)).size,20);
  for(const task of tasks) {assert.equal(gradeAnswer(task,task.expected).passed,true);assert.equal(gradeAnswer(task,{}).passed,false);}
  const report=await runBenchmark(project,{agent:'fixture'});assert.equal(report.fixtureOnly,true);assert.equal(report.completedTrials,200);assert.equal(report.expectedTrials,200);
  const cliShape=await runBenchmark(project,{agent:'fixture',trials:1,tasks:['metrics-2'],provider:undefined,model:undefined});
  assert.equal(auditBenchmark(project,cliShape.id).status,'complete');
  assert.match(report.interpretation,/not model responses/);assert.equal(auditBenchmark(project,report.id).status,'complete');
  const receiptPath=join(report.directory,'metrics-1-1','receipt.json'),original=readFileSync(receiptPath);
  writeFileSync(receiptPath,'{}');assert.equal(auditBenchmark(project,report.id).status,'incomplete');writeFileSync(receiptPath,original);
  const requestPath=join(report.directory,'metrics-1-1','request.json'),request=readFileSync(requestPath);
  writeFileSync(requestPath,JSON.stringify({taskId:'metrics-1',trial:1,prompt:'Changed'}));assert.equal(auditBenchmark(project,report.id).status,'incomplete');writeFileSync(requestPath,request);
  const protocol=JSON.parse(readFileSync(join(report.directory,'protocol.json'),'utf8'));assert.equal(protocol.options.trials,10);assert.equal(typeof protocol.instructionHashes['system.md'],'string');assert.equal(protocol.requestedModel,'agent-default');
  await assert.rejects(runBenchmark(project,{agent:'fixture',trials:0}),/1–10/);
  await assert.rejects(runBenchmark(project,{agent:'fixture',mode:'same-model'}),/explicit model/);
  assert.deepEqual(parseAnswer('```json\n{"complete":true}\n```'),{complete:true});assert.throws(()=>parseAnswer('fluent prose'),SyntaxError);
 }finally{rmSync(project,{recursive:true,force:true});}
});
test('Doctor does not confuse prerequisites with live model or clipboard verification',async()=>{
 const project=mkdtempSync(join(tmpdir(),'repi-doctor-'));
 try {const report=await doctor(project);assert.equal(report.connection.modelAccessVerified,false);assert.equal(report.clipboard.verified,false);assert.equal(report.web.searchApiRequired,false);}
 finally{rmSync(project,{recursive:true,force:true});}
});
