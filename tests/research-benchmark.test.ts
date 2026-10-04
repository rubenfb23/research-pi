import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,mkdirSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {researchTasks,gradeResearch} from '../src/research-bench-tasks.js';
import {runResearchBenchmark,auditResearchBenchmark,researchBenchOptions} from '../src/research-benchmark.js';
import {sandboxAvailable,runSandboxedPython,workspacePath,workspaceTools} from '../src/research-bench-tools.js';
import {predictionMetrics,summarizeTrainingRuns} from '../src/research-metrics.js';
import {hash,readJson,writeJson} from '../src/storage.js';
import {ModelRuntime} from '@earendil-works/pi-coding-agent';
import {createAssistantMessageEventStream} from '@earendil-works/pi-ai/utils/event-stream';
import type {AssistantMessage} from '@earendil-works/pi-ai';
import {runResearchWorker,type ResearchWorkerConfig,researchHarnesses} from '../src/research-bench-worker.js';

const sandbox=sandboxAvailable();
test('Generated task variants, source grounding and execution gates reject plausible but wrong artifacts',()=>{
 const dev=researchTasks('dev'),validation=researchTasks('validation');assert.equal(dev.length,7);assert.notEqual(hash(dev),hash(validation));assert.equal(hash(dev),hash(researchTasks('dev')));
 for(const task of dev) {
  const answer=structuredClone(task.expected);if(task.id==='source-synthesis')answer.citations=Object.entries(task.files).map(([source,quote])=>({source,quote}));
  assert(gradeResearch(task,answer,{executed:true,replayed:true,replayAnswer:answer}).passed);assert(!gradeResearch(task,{}).passed);
  if(task.requiresPython)assert(!gradeResearch(task,answer).passed);
  if(task.id==='source-synthesis'){answer.citations=[{source:'sources/study-a.txt',quote:'Fabricated support that sounds entirely plausible but was never in the source.'}];assert(!gradeResearch(task,answer).passed);}
 }
 assert.throws(()=>researchBenchOptions({trials:0}),/trials/);assert.throws(()=>researchBenchOptions({harnesses:['pi','pi']}),/distinct/);assert.throws(()=>researchBenchOptions({maxRequests:13}),/maxRequests/);
});
test('Research metrics reject invalid observations and prevent averaging incomplete seed coverage',()=>{
 const metric=predictionMetrics([0,1],[0,0],[.25,.75]);assert.equal(metric.accuracy,.5);assert(Math.abs(metric.logLoss+Math.log(.75))<1e-12);assert.equal(metric.n,2);
 assert.throws(()=>predictionMetrics([0,1],[0],[.25,.75]),/equal-length/);assert.throws(()=>predictionMetrics([0],[0],[NaN]),/finite/);
 const input={plannedSeeds:Array.from({length:10},(_,i)=>i+1),methods:['a'],runs:Array.from({length:10},(_,i)=>({method:'a',seed:i+1,status:'completed',value:i}))};
 const good=summarizeTrainingRuns(input);assert(good.complete);assert.equal(good.summaries[0]!.mean,4.5);assert(Math.abs(good.summaries[0]!.sampleSd-Math.sqrt(82.5/9))<1e-12);
 const bad=summarizeTrainingRuns({...input,runs:[...input.runs.slice(1),input.runs[1]!]});assert(!bad.complete);assert.deepEqual(bad.missing,['a:1']);assert.deepEqual(bad.duplicates,['a:2']);assert.deepEqual(bad.summaries,[]);
});
test('Matrix evaluator executes 210 fixture attempts, regrades independently and detects artifact/request tampering',async()=>{
 const project=mkdtempSync(join(tmpdir(),'repi-matrix-'));
 try {
  const result=await runResearchBenchmark(project,{fixture:true});assert.equal(result.expectedTrials,210);assert.equal(result.attemptedTrials,210);assert(result.fixtureOnly);assert.equal(result.status,'complete');assert(result.conditions.every((c:any)=>c.score===1&&c.catalogCostUsd===null));
  assert.equal(auditResearchBenchmark(project,result.id).status,'complete');
  const protocol=readJson<any>(join(result.directory,'protocol.json')),caseId=protocol.schedule[0].caseId,file=join(result.directory,caseId,'workspace/answer.json'),original=readFileSync(file);
  writeFileSync(file,'{}');assert.equal(auditResearchBenchmark(project,result.id).status,'incomplete');writeFileSync(file,original);
  const request=join(result.directory,caseId,'request.json'),previous=readFileSync(request);writeFileSync(request,'{}');assert.equal(auditResearchBenchmark(project,result.id).status,'incomplete');writeFileSync(request,previous);
  assert.equal(auditResearchBenchmark(project,result.id).status,'complete');assert.match(readFileSync(join(result.directory,'report.html'),'utf8'),/FIXTURE ONLY/);
 }finally{rmSync(project,{recursive:true,force:true});}
});
test('Workspace tools reject traversal, immutable-input mutations and symlink access',async()=>{
 const root=mkdtempSync(join(tmpdir(),'repi-workspace-')),workspace=join(root,'work');mkdirSync(workspace);writeFileSync(join(workspace,'input.json'),'{}');symlinkSync(root,join(workspace,'escape'),'dir');
 try {
  assert.throws(()=>workspacePath(workspace,'../secret'),/relative/);assert.throws(()=>workspacePath(workspace,'/etc/passwd'),/relative/);assert.throws(()=>workspacePath(workspace,'escape/file'),/escapes/);
  const tools=workspaceTools(workspace,new Set(['input.json']),false),write=tools.find(t=>t.name==='write_file')!;
  await assert.rejects(write.execute('test',{path:'input.json',content:'changed'}),/read-only/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('Actual isolated Python reproduces a twenty-run implementation and cannot read host files or open a network',{skip:!sandbox},async()=>{
 const root=mkdtempSync(join(tmpdir(),'repi-python-bench-'));
 try {
  const task=researchTasks('dev').find(t=>t.id==='replicate-study')!;writeFileSync(join(root,'study.json'),task.files['study.json']!);
  writeFileSync(join(root,'analysis.py'),`import json\np=json.load(open('study.json'));runs=[]\nfor method in p['methods']:\n for seed in p['seeds']:\n  state=seed;rows=p['train']\n  if method=='candidate':\n   sampled=[]\n   for _ in range(len(rows)):\n    state=(1664525*state+1013904223)%2**32;sampled.append(rows[int(state/2**32*len(rows))])\n   rows=sampled\n  mean=lambda y:sum(r['x'] for r in rows if r['y']==y)/sum(r['y']==y for r in rows)\n  threshold=(mean(0)+mean(1))/2;predictions=[int(r['x']>=threshold) for r in p['test']]\n  runs.append(dict(method=method,seed=seed,predictions=predictions,accuracy=sum(a==b['y'] for a,b in zip(predictions,p['test']))/len(predictions)))\nprint(json.dumps(dict(runs=runs,populationGeneralizationEstablished=False)))\n`);
  const result=await runSandboxedPython(root,'analysis.py');assert.equal(result.exitCode,0,result.stderr);const answer=JSON.parse(result.stdout);assert(gradeResearch(task,answer,{executed:true,replayed:true,replayAnswer:answer}).passed);
  writeFileSync(join(root,'probe.py'),`import os,socket\nassert not os.path.exists('/home/ruben/.codex')\nassert not os.environ.get('OPENCODE_API_KEY')\ns=socket.socket();s.settimeout(.1)\ntry:\n s.connect(('1.1.1.1',80));raise RuntimeError('network escaped')\nexcept OSError: pass\nprint('isolated')\n`);
  const probe=await runSandboxedPython(root,'probe.py');assert.equal(probe.exitCode,0,probe.stderr);assert.equal(probe.stdout.trim(),'isolated');
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('Actual SDK profiles use matching model settings, bounded tools and a request limit',async()=>{
 const root=mkdtempSync(join(tmpdir(),'repi-profile-sdk-'));
 try {
  const runtime=await ModelRuntime.create({authPath:join(root,'auth.json'),modelsPath:null,refreshOnCreate:false});
  let loop=false;const prompts:string[]=[],payloads:any[]=[];
  runtime.registerProvider('bench-test',{api:'bench-test-api',apiKey:'fake-test-only',baseUrl:'https://offline.invalid',models:[{id:'fixture-model',name:'fixture',api:'bench-test-api',baseUrl:'https://offline.invalid',reasoning:false,input:['text'],contextWindow:64000,maxTokens:4096,cost:{input:0,output:0,cacheRead:0,cacheWrite:0}}],streamSimple(model,context,options){
   prompts.push(JSON.stringify(context.messages.filter(message=>message.role==='system')));payloads.push(options);const stream=createAssistantMessageEventStream(),last=context.messages.at(-1);
   queueMicrotask(()=>{const tool=loop||last?.role==='user';const msg:AssistantMessage={role:'assistant',api:model.api,provider:model.provider,model:model.id,content:tool?[{type:'toolCall',id:'write-'+Date.now(),name:'write_file',arguments:{path:'answer.json',content:'{"ok":true}'}}]:[{type:'text',text:'Submitted.'}],stopReason:tool?'toolUse':'stop',timestamp:Date.now(),usage:{input:10,output:10,cacheRead:0,cacheWrite:0,totalTokens:20,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}};stream.push({type:'done',reason:msg.stopReason as 'stop'|'toolUse',message:msg});stream.end();});return stream;
  }});
  for(const harness of researchHarnesses) {
   const workspace=join(root,harness);mkdirSync(workspace);const config:ResearchWorkerConfig={harness,provider:'bench-test',model:'fixture-model',workspace,output:workspace,prompt:'Submit artifact',protectedFiles:[],python:false,maxRequests:3,maxOutputTokens:512,maxReportedTokens:2000,thinking:'off',temperature:.2};
   await runResearchWorker(config,runtime);assert.equal(readJson<any>(join(workspace,'result.json')).status,'completed');assert.deepEqual(readJson(join(workspace,'answer.json')),{ok:true});const metadata=readJson<any>(join(workspace,'metadata.json'));assert(!metadata.tools.includes('bash'));assert(!metadata.tools.includes('read'));assert.equal(metadata.tools.includes('calculate_prediction_metrics'),harness==='repi');assert.equal(metadata.reasoningResolved,'off');
  }
  assert(!prompts[0]!.includes('You are ResearchPi'));assert(prompts.some(p=>p.includes('You are ResearchPi')));assert(payloads.every(p=>p.maxTokens===512&&p.temperature===.2));
  loop=true;const workspace=join(root,'limit');mkdirSync(workspace);await runResearchWorker({harness:'pi',provider:'bench-test',model:'fixture-model',workspace,output:workspace,prompt:'Loop',protectedFiles:[],python:false,maxRequests:1,maxOutputTokens:512,maxReportedTokens:2000,thinking:'off',temperature:.2},runtime);
  const limited=readJson<any>(join(workspace,'result.json'));assert.equal(limited.status,'failed');assert.equal(limited.requests,1);assert.equal(limited.stopReason,'request_limit');
 }finally{rmSync(root,{recursive:true,force:true});}
});
