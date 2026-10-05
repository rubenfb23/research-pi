import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {existsSync,mkdirSync,readdirSync,readFileSync,writeFileSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT,stateDir,resource} from './paths.js';
import {hash,readJson,writeJson} from './storage.js';
import {codeFingerprint} from './protocol.js';
import {selectedConfig,connectionRuntime} from './connections.js';
import {researchTasks,gradeResearch,type ResearchTask,type ResearchGrade} from './research-bench-tasks.js';
import {researchHarnesses,type ResearchHarness,type ResearchWorkerConfig} from './research-bench-worker.js';
import {readWorkspace,runSandboxedPython,sandboxAvailable} from './research-bench-tools.js';
import {thinkingLevels,type ThinkingLevel} from './preferences.js';

export interface ResearchBenchOptions {harnesses?:ResearchHarness[];models?:string[];provider?:string;split?:'dev'|'validation';seed?:number;trials?:number;tasks?:string[];timeoutSeconds?:number;maxRequests?:number;maxOutputTokens?:number;maxReportedTokens?:number;thinking?:ThinkingLevel;temperature?:number;fixture?:boolean;}
export interface ResearchReceipt {caseId:string;harness:ResearchHarness;model:string;taskId:string;category:string;trial:number;status:string;grade:ResearchGrade;durationSeconds:number;requests:number;reportedTokens:number;catalogCostUsd:number|null;answer:unknown;execution:{executed:boolean;replayed:boolean;replayAnswer:unknown};observedModels:string[];metadata:unknown;latencies:{firstDeltaMs:number|null;firstTextMs:number|null;estimatedOutputTokensPerSecond:number|null}[];error:string|null;traceHash:string;artifacts:Record<string,string>;evidenceFiles:Record<string,string>;protocolHash:string;receiptHash:string;}
const fingerprint=()=>{
 const files:Record<string,string>={};const walk=(directory:string,prefix='')=>{for(const entry of readdirSync(directory,{withFileTypes:true})) {const path=join(directory,entry.name),name=prefix+entry.name;if(entry.isDirectory())walk(path,name+'/');else if(entry.isFile())files[name]=hash(readFileSync(path,'utf8'));}};walk(resource(''));
 return hash({code:codeFingerprint(),launcher:readFileSync(join(ROOT,'repi'),'utf8'),resources:files});
};
export function researchBenchOptions(options:ResearchBenchOptions) {
 const opts={harnesses:options.harnesses??[...researchHarnesses],models:options.models??[],provider:options.provider??'',split:options.split??'dev',seed:options.seed??20261004,trials:options.trials??10,
  tasks:options.tasks??[],timeoutSeconds:options.timeoutSeconds??120,maxRequests:options.maxRequests??6,maxOutputTokens:options.maxOutputTokens??4096,maxReportedTokens:options.maxReportedTokens??60000,
  thinking:options.thinking??'off',temperature:options.temperature??.2,fixture:options.fixture??false};
 if(!opts.harnesses.length||new Set(opts.harnesses).size!==opts.harnesses.length||opts.harnesses.some(h=>!researchHarnesses.includes(h))||new Set(opts.models).size!==opts.models.length||opts.models.some(m=>!m||m.length>150)) throw new Error('Choose distinct supported harness profiles and model IDs.');
 if(!['dev','validation'].includes(opts.split)||!thinkingLevels.includes(opts.thinking)||!Number.isFinite(opts.temperature)||opts.temperature<0||opts.temperature>1) throw new Error('Invalid split, reasoning or temperature.');
 for(const [name,value,min,max] of [['seed',opts.seed,0,2**32-1],['trials',opts.trials,1,10],['timeoutSeconds',opts.timeoutSeconds,1,300],['maxRequests',opts.maxRequests,1,12],['maxOutputTokens',opts.maxOutputTokens,256,8192],['maxReportedTokens',opts.maxReportedTokens,1000,200000]] as const) if(!Number.isInteger(value)||value<min||value>max) throw new Error(`Invalid ${name}: use ${min}–${max}.`);
 return opts;
}
async function worker(configPath:string,cwd:string,timeout:number,signal?:AbortSignal) {
 return new Promise<{exitCode:number|null;interrupted:boolean;stdout:string;stderr:string}>( (resolve,reject)=>{
  signal?.throwIfAborted();const child=spawn(process.execPath,[join(ROOT,'dist/research-bench-worker.js'),configPath],{cwd,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});
  let stdout='',stderr='',interrupted=false;
  const stop=()=>{interrupted=true;try{if(child.pid&&process.platform!=='win32')process.kill(-child.pid,'SIGKILL');else child.kill('SIGKILL');}catch{}};
  const timer=setTimeout(stop,timeout);signal?.addEventListener('abort',stop,{once:true});
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',stop);};
  child.stdout.on('data',chunk=>{stdout+=chunk;if(stdout.length>1000000)stop();});child.stderr.on('data',chunk=>{stderr+=chunk;if(stderr.length>1000000)stop();});
  child.once('error',e=>{cleanup();reject(e);});child.once('close',exitCode=>{cleanup();resolve({exitCode,interrupted,stdout,stderr});});
 });
}
function artifacts(workspace:string):Record<string,string> {
 const files:Record<string,string>={};
 const walk=(directory:string,prefix='')=>{for(const entry of readdirSync(directory,{withFileTypes:true})) {if(entry.name.startsWith('.'))continue;const path=join(directory,entry.name),name=prefix+entry.name;if(entry.isSymbolicLink())throw new Error('Artifact symlinks are forbidden.');if(entry.isDirectory())walk(path,name+'/');else if(entry.isFile()){if(lstatSync(path).size>256000)throw new Error('Oversized artifact.');files[name]=hash(readFileSync(path,'utf8'));}}};walk(workspace);return files;
}
export async function runResearchBenchmark(project:string,options:ResearchBenchOptions,signal?:AbortSignal) {
 const selected=selectedConfig(project),opts=researchBenchOptions({...options,models:options.models??(selected?[selected.model]:[]),provider:options.provider??selected?.provider});
 if(!opts.fixture && (!opts.models.length||!opts.provider))throw new Error('Connect a model first, or specify --provider and --models.');
 if(opts.fixture) {opts.models=['reference-fixture'];opts.provider='fixture';}
 const pythonAvailable=!opts.fixture&&sandboxAvailable();
 const all=researchTasks(opts.split,opts.seed),tasks=all.filter(t=>!opts.tasks.length||opts.tasks.includes(t.id));
 if(!tasks.length||opts.tasks.some(id=>!tasks.some(t=>t.id===id)))throw new Error('Unknown task IDs.');
 if(!opts.fixture) {
  const runtime=await connectionRuntime();for(const model of opts.models) if(!runtime.getModel(opts.provider,model)) throw new Error(`Unknown ${opts.provider}/${model}`);
  if(!await runtime.checkAuth(opts.provider)) throw new Error('Credentials unavailable; use repi connect.');
  if(tasks.some(t=>t.requiresPython)&&!pythonAvailable)throw new Error('Executed replication requires working Linux Bubblewrap and /usr/bin/python3. No unsandboxed fallback is permitted.');
 }
 const id=randomUUID(),directory=join(stateDir(project),'research-benchmarks',id);mkdirSync(directory,{recursive:true,mode:0o700});
 const schedule=tasks.flatMap((task,ti)=>Array.from({length:opts.trials},(_,i)=>opts.models.flatMap((model,mi)=>{
  const rotation=(ti+i+mi)%opts.harnesses.length,order=[...opts.harnesses.slice(rotation),...opts.harnesses.slice(0,rotation)];
  return order.map(harness=>({taskId:task.id,trial:i+1,model,harness,caseId:`${task.id}-${i+1}-${mi}-${harness}`}));
 })).flat());
 const body={schemaVersion:2,id,createdAt:new Date().toISOString(),options:opts,tasks,schedule,codeHash:fingerprint(),instructionHashes:Object.fromEntries(['system.md','manuscript-policy.md','web-policy.md'].map(name=>[name,hash(readFileSync(resource(name),'utf8'))])),
  scorePolicy:'Equal category-weighted mean rubric fraction, including all planned attempts. Missing and infrastructure-failed attempts score zero. Report full-pass rate and each category separately.',
  scope:'Seven synthetic research workflow tasks, including a tiny independently reexecuted study. Does not establish real-paper replication, originality, scientific expertise or PhD equivalence.',
  splitPolicy:'dev is for tuning. validation uses a separate generated variant; publicly inspectable generators are not a sealed, external held-out benchmark. Freeze before evaluation and never tune on validation answers.',
  controls:'Same model/provider/API and requested effort/sampling/budgets across controlled Pi SDK profiles; isolated resource discovery. Identical bounded workspace tools; ResearchPi adds scientific tools. Profiles are not full unmodified CLIs.',
  limits:'Per-request output and request-count limits enforced. Reported-token threshold checked between requests, not a hard total-token/dollar cap. Wall deadline enforced. Python restricted to Linux Bubblewrap, no network, read-only workspace, bounded CPU/memory. Native host shell/web tools disabled.',
  host:{platform:process.platform,arch:process.arch,node:process.versions.node,pythonSandbox:pythonAvailable},fixtureOnly:opts.fixture};
 const protocol={...body,protocolHash:hash(body)};writeJson(join(directory,'protocol.json'),protocol);
 const receipts:ResearchReceipt[]=[];
 for(const item of schedule) {
  if(signal?.aborted)break;
  if(fingerprint()!==protocol.codeHash)throw new Error('Code changed during benchmark.');
  const task=tasks.find(t=>t.id===item.taskId)!,caseDir=join(directory,item.caseId),workspace=join(caseDir,'workspace');mkdirSync(workspace,{recursive:true,mode:0o700});
  for(const [name,text] of Object.entries(task.files)){const target=join(workspace,name);mkdirSync(join(target,'..'),{recursive:true});writeFileSync(target,text,{mode:0o600});}
  const prompt='Complete this research workflow using only the supplied workspace evidence. Do not seek reference answers or a grader. '+task.instruction+'\nAvailable input files: '+Object.keys(task.files).join(', ')+'.\nUse write_file to save answer.json. A textual promise or an answer only in chat is not a submitted artifact.';
  const config:ResearchWorkerConfig={...item,provider:opts.provider,workspace,output:caseDir,prompt,protectedFiles:Object.keys(task.files),python:pythonAvailable,maxRequests:opts.maxRequests,maxOutputTokens:opts.maxOutputTokens,maxReportedTokens:opts.maxReportedTokens,thinking:opts.thinking,temperature:opts.temperature};
  const configPath=join(caseDir,'request.json');writeJson(configPath,config);
  const started=Date.now();let result:any={},metadata:unknown=null,trace:unknown=null,answer:unknown=null,status='completed',error:string|null=null,execution={executed:false,replayed:false,replayAnswer:null as unknown};
  try {
   if(opts.fixture) {
    answer=structuredClone(task.expected);if(task.id==='source-synthesis') (answer as any).citations=Object.entries(task.files).map(([source,text])=>({source,quote:text}));
    writeJson(join(workspace,'answer.json'),answer);metadata={fixtureOnly:true};trace={fixtureOnly:true};
    execution={executed:task.requiresPython===true,replayed:task.requiresPython===true,replayAnswer:answer};result={requests:0,reportedTokens:0,catalogCostUsd:null,observedModels:[]};
   } else {
    trace=await worker(configPath,workspace,opts.timeoutSeconds*1000,signal);
    result=existsSync(join(caseDir,'result.json'))?readJson(join(caseDir,'result.json')):{};
    metadata=existsSync(join(caseDir,'metadata.json'))?readJson(join(caseDir,'metadata.json')):null;
    const events:any[]=existsSync(join(caseDir,'events.json'))?readJson(join(caseDir,'events.json')):[];
    trace={process:trace,events,result};
    if((trace as any).process.interrupted || (trace as any).process.exitCode!==0 || result.status!=='completed')throw new Error((trace as any).process.interrupted?'trial_timeout_or_cancelled':result.stopReason??'provider_or_worker_failure');
    if(!result.observedModels?.length || result.observedModels.some((m:string)=>m!==`${opts.provider}/${item.model}`))throw new Error('reported_model_mismatch');
    answer=JSON.parse(readWorkspace(workspace,'answer.json'));
    if(task.requiresPython) {
     execution.executed=events.some(e=>e.type==='tool_execution_end'&&e.toolName==='run_python'&&!e.isError&&e.result?.details?.exitCode===0);
     if(existsSync(join(workspace,'analysis.py'))) {const replay=await runSandboxedPython(workspace,'analysis.py',[],signal);execution.replayed=replay.exitCode===0&&!replay.interrupted;try{execution.replayAnswer=JSON.parse(replay.stdout);}catch{}writeJson(join(caseDir,'replay.json'),replay);}
    }
   }
  } catch(e) {status=signal?.aborted?'cancelled':'failed';error=(e as Error).message;}
  if(fingerprint()!==protocol.codeHash)throw new Error('Code changed during trial; evidence retained.');
  let digests:Record<string,string>={};try{digests=artifacts(workspace);}catch{status='failed';error='artifact_contract_failure';}
  if(Object.entries(task.files).some(([name,text])=>digests[name]!==hash(text))){status='failed';error='input_evidence_changed';}
  const grade=status==='completed'?gradeResearch(task,answer,execution):{passed:false,score:0,checks:[{name:'completed_artifact',passed:false}]};
  writeJson(join(caseDir,'trace.json'),trace);
  const evidenceFiles=Object.fromEntries(['request.json','metadata.json','result.json','events.json','replay.json'].filter(name=>existsSync(join(caseDir,name))).map(name=>[name,hash(readFileSync(join(caseDir,name),'utf8'))]));
  const receiptBody={...item,category:task.category,status,grade,durationSeconds:(Date.now()-started)/1000,requests:result.requests??0,reportedTokens:result.reportedTokens??0,catalogCostUsd:result.catalogCostUsd>0?result.catalogCostUsd:null,answer,execution,observedModels:result.observedModels??[],metadata,latencies:result.latencies??[],error,traceHash:hash(trace),artifacts:digests,evidenceFiles,protocolHash:protocol.protocolHash};
  const receipt={...receiptBody,receiptHash:hash(receiptBody)};writeJson(join(caseDir,'receipt.json'),receipt);receipts.push(receipt);
  console.error(`${item.harness}/${item.model} ${task.id} trial=${item.trial}: ${status}; score=${grade.score.toFixed(2)}`);
  if(status!=='completed'&&['provider_or_worker_failure','provider_or_session_failure','reported_model_mismatch'].includes(error??''))break;
 }
 const summary=researchSummary(protocol,receipts);writeJson(join(directory,'summary.json'),summary);writeFileSync(join(directory,'report.html'),researchReport(summary));return {...summary,directory};
}
const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return sorted.length?sorted.length%2?sorted[Math.floor(sorted.length/2)]!:(sorted[sorted.length/2-1]!+sorted[sorted.length/2]!)/2:null;};
export function researchSummary(protocol:any,receipts:ResearchReceipt[]) {
 const categories=[...new Set<string>(protocol.tasks.map((t:ResearchTask)=>t.category))];
 const conditions=protocol.options.models.flatMap((model:string)=>protocol.options.harnesses.map((harness:string)=>{
  const planned=protocol.schedule.filter((c:any)=>c.model===model&&c.harness===harness),rs=receipts.filter(r=>r.model===model&&r.harness===harness);
  const byCategory=Object.fromEntries(categories.map(category=>{const cases=planned.filter((c:any)=>protocol.tasks.find((t:ResearchTask)=>t.id===c.taskId)?.category===category),items=rs.filter(r=>r.category===category);return [category,{planned:cases.length,completed:items.filter(r=>r.status==='completed').length,passed:items.filter(r=>r.grade.passed).length,score:items.reduce((sum,r)=>sum+r.grade.score,0)/cases.length}];}));
  return {harness,model,provider:protocol.options.provider,planned:planned.length,attempted:rs.length,completed:rs.filter(r=>r.status==='completed').length,passed:rs.filter(r=>r.grade.passed).length,score:categories.reduce((sum,category)=>sum+(byCategory[category]?.score??0),0)/categories.length,categories:byCategory,
   medianSeconds:median(rs.map(r=>r.durationSeconds)),reportedTokens:rs.reduce((s,r)=>s+r.reportedTokens,0),requests:rs.reduce((s,r)=>s+r.requests,0),
   medianFirstDeltaMs:median(rs.flatMap(r=>r.latencies.map(l=>l.firstDeltaMs).filter((v):v is number=>v!==null))),medianFirstTextMs:median(rs.flatMap(r=>r.latencies.map(l=>l.firstTextMs).filter((v):v is number=>v!==null))),estimatedMedianOutputTokensPerSecond:median(rs.flatMap(r=>r.latencies.map(l=>l.estimatedOutputTokensPerSecond).filter((v):v is number=>v!==null))),
   catalogCostUsd:rs.length&&rs.every(r=>r.catalogCostUsd!==null)?rs.reduce((s,r)=>s+r.catalogCostUsd!,0):null,
   meanCatalogCostPerSuccessUsd:rs.length&&rs.every(r=>r.catalogCostUsd!==null)&&rs.some(r=>r.grade.passed)?rs.reduce((s,r)=>s+r.catalogCostUsd!,0)/rs.filter(r=>r.grade.passed).length:null};
 }));
 const comparisons=protocol.options.models.flatMap((model:string)=>protocol.options.harnesses.filter((h:string)=>h!=='pi').map((harness:string)=>{
  const baseline=conditions.find((c:any)=>c.model===model&&c.harness==='pi'),candidate=conditions.find((c:any)=>c.model===model&&c.harness===harness);
  if(!baseline||!candidate)return null;
  const differences=protocol.tasks.map((t:ResearchTask)=>{
   const values=(h:string)=>receipts.filter(r=>r.model===model&&r.harness===h&&r.taskId===t.id).reduce((s,r)=>s+r.grade.score,0)/protocol.options.trials;
   return values(harness)-values('pi');
  });
  let interval:number[]|null=null;
  if(differences.length>=3&&protocol.options.trials>=2&&baseline.completed===baseline.planned&&candidate.completed===candidate.planned) {
   let state=9173;const samples=Array.from({length:2000},()=>differences.reduce((sum:number)=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return sum+differences[Math.floor(state/2**32*differences.length)];},0)/differences.length).sort((a,b)=>a-b);
   interval=[samples[49]!*100,samples[1949]!*100];
  }
  return {model,baseline:'pi',harness,deltaPercentagePoints:(candidate.score-baseline.score)*100,descriptiveTaskClusterBootstrap95:interval,uncertaintyScope:'Task-cluster percentile bootstrap on this fixed generated suite, conditional on settings; not population/general scientific superiority. Fewer than three tasks, fewer than two repeats, or incomplete conditions return null.'};
 })).filter(Boolean);
 return {id:protocol.id,protocolHash:protocol.protocolHash,status:receipts.length===protocol.schedule.length&&receipts.every(r=>r.status==='completed')?'complete':'incomplete',split:protocol.options.split,fixtureOnly:protocol.fixtureOnly,conditions,comparisons,settings:{provider:protocol.options.provider,thinking:protocol.options.thinking,temperature:protocol.options.temperature,timeoutSeconds:protocol.options.timeoutSeconds,maxRequests:protocol.options.maxRequests,maxOutputTokens:protocol.options.maxOutputTokens,maxReportedTokens:protocol.options.maxReportedTokens},expectedTrials:protocol.schedule.length,attemptedTrials:receipts.length,receiptHashes:receipts.map(r=>r.receiptHash),scope:protocol.scope,
  interpretation:protocol.fixtureOnly?'Stored-reference evaluator smoke; no model performance.':'Observed results on this generated synthetic suite. No superiority, discovery or PhD-equivalence claim. Cost is catalog-priced, never independently verified billing. Missing telemetry remains null.'};
}
export function auditResearchBenchmark(project:string,id:string) {
 if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('Provide a benchmark run UUID.');
 const directory=join(stateDir(project),'research-benchmarks',id),protocol=readJson<any>(join(directory,'protocol.json')),{protocolHash,...body}=protocol;
 if(hash(body)!==protocolHash||protocol.id!==id)throw new Error('Frozen protocol hash changed.');
 const errors:string[]=[],receipts:ResearchReceipt[]=[];
 for(const item of protocol.schedule) {
  const caseDir=join(directory,item.caseId),task=protocol.tasks.find((t:ResearchTask)=>t.id===item.taskId) as ResearchTask;
  try {
   const receipt=readJson<ResearchReceipt>(join(caseDir,'receipt.json')),{receiptHash,...content}=receipt;
   if(hash(content)!==receiptHash||receipt.protocolHash!==protocolHash||['caseId','harness','model','taskId','trial'].some(key=>(receipt as any)[key]!==item[key]))throw new Error('Receipt hash or identity mismatch.');
   if(hash(readJson(join(caseDir,'trace.json')))!==receipt.traceHash)throw new Error('Private trace changed.');
   for(const [name,digest] of Object.entries(receipt.evidenceFiles))if(hash(readFileSync(join(caseDir,name),'utf8'))!==digest)throw new Error('Retained request/telemetry/replay changed.');
   const request=readJson<ResearchWorkerConfig>(join(caseDir,'request.json'));
   if(request.harness!==item.harness||request.model!==item.model||request.provider!==protocol.options.provider||hash(request.protectedFiles)!==hash(Object.keys(task.files)))throw new Error('Requested condition changed.');
   if(hash(artifacts(join(caseDir,'workspace')))!==hash(receipt.artifacts))throw new Error('Workspace artifact changed.');
   if(Object.entries(task.files).some(([name,text])=>receipt.artifacts[name]!==hash(text)))throw new Error('Input evidence changed.');
   if(receipt.status==='completed') {
    if(hash(JSON.parse(readWorkspace(join(caseDir,'workspace'),'answer.json')))!==hash(receipt.answer))throw new Error('Submitted answer changed.');
    if(hash(gradeResearch(task,receipt.answer,receipt.execution))!==hash(receipt.grade))throw new Error('Stored grade differs from recalculation.');
   }else errors.push(item.caseId+': '+receipt.status);
   receipts.push(receipt);
  }catch(e){errors.push(item.caseId+': '+(e as Error).message);}
 }
 for(const entry of readdirSync(directory,{withFileTypes:true}).filter(e=>e.isDirectory()))if(!protocol.schedule.some((item:any)=>item.caseId===entry.name))errors.push('Unplanned trial directory: '+entry.name);
 const summary=readJson(join(directory,'summary.json'));if(hash(researchSummary(protocol,receipts))!==hash(summary))errors.push('Summary differs from recalculated evidence.');
 return {id,status:errors.length?'incomplete':'complete',errors,expectedTrials:protocol.schedule.length,auditedTrials:receipts.length,fixtureOnly:protocol.fixtureOnly,scope:'Host-controlled consistency and independent rubric recalculation, not adversarial proof or scientific certification.'};
}
const htmlEscape=(value:unknown)=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function researchReport(summary:ReturnType<typeof researchSummary>) {
 const rows=summary.conditions.map((c:any)=>`<tr><td>${htmlEscape(c.harness)}</td><td>${htmlEscape(c.model)}</td><td>${(c.score*100).toFixed(1)}%</td><td>${c.passed}/${c.planned}</td><td>${c.completed}/${c.planned}</td><td>${c.medianSeconds?.toFixed(2)??'Unavailable'}</td><td>${c.reportedTokens}</td><td>${c.catalogCostUsd?.toFixed(4)??'Unavailable'}</td></tr>`).join('');
 const panels=summary.conditions.map((c:any)=>`<article><h2>${htmlEscape(c.harness)} · ${htmlEscape(c.model)}</h2>${Object.entries(c.categories).map(([name,value])=>`<p>${htmlEscape(name)}: ${((value as any).score*100).toFixed(1)}%</p><meter min="0" max="1" value="${(value as any).score}"></meter>`).join('')}</article>`).join('');
 const maxTime=Math.max(1,...summary.conditions.map((c:any)=>c.medianSeconds??0));
 const points=summary.conditions.map((c:any,i:number)=>`<g><circle cx="${60+((c.medianSeconds??0)/maxTime)*520}" cy="${230-c.score*180}" r="7" fill="${['#9bedd8','#c4b5fd','#fbbf24'][i%3]}"></circle><text x="${60+((c.medianSeconds??0)/maxTime)*520}" y="${218-c.score*180}" fill="#e5e7eb" font-size="12">${htmlEscape(c.harness)}</text></g>`).join('');
 const chart=`<svg role="img" aria-label="Rubric quality versus median task wall time, descriptive observations" viewBox="0 0 680 300"><path d="M60 35V230H610" stroke="#64748b" fill="none"/><text x="60" y="280" fill="#e5e7eb">Median task wall time: 0 to ${maxTime.toFixed(1)} seconds</text><text x="60" y="20" fill="#e5e7eb">Rubric quality: 0–100%, higher and left is preferable</text>${points}</svg>`;
 const uplift=summary.comparisons.map((c:any)=>`<p>${htmlEscape(c.harness)} vs Pi · ${htmlEscape(c.model)}: ${c.deltaPercentagePoints.toFixed(1)} percentage points; descriptive 95% interval: ${c.descriptiveTaskClusterBootstrap95?.map((v:number)=>v.toFixed(1)).join(' to ')??'insufficient completed repeated tasks'}.</p>`).join('');
 const timing=summary.conditions.map((c:any)=>`<p>${htmlEscape(c.harness)}: first observed delta ${c.medianFirstDeltaMs?.toFixed(0)??'unavailable'} ms; first answer text ${c.medianFirstTextMs?.toFixed(0)??'unavailable'} ms; approximate output throughput ${c.estimatedMedianOutputTokensPerSecond?.toFixed(1)??'unavailable'} tokens/s.</p>`).join('');
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ResearchPi benchmark</title><style>body{background:#111827;color:#e5e7eb;font:16px system-ui;max-width:1200px;margin:auto;padding:32px}h1,h2{color:#9bedd8}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:12px;border-bottom:1px solid #374151}.scroll{overflow:auto}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:20px}article{padding:20px;background:#1f2937;border-radius:12px}meter{width:100%;height:20px}svg{max-width:760px;width:100%}small{color:#a1a1aa}</style><h1>Research workflow benchmark</h1><p>${htmlEscape(summary.split)} · ${htmlEscape(summary.status)} · ${summary.attemptedTrials}/${summary.expectedTrials} planned attempts${summary.fixtureOnly?' · FIXTURE ONLY':''}</p><p>${htmlEscape(summary.scope)}</p><p>Settings: ${htmlEscape(JSON.stringify(summary.settings))}</p><div class="scroll"><table><thead><tr><th>Harness</th><th>Model</th><th>Rubric quality</th><th>Full passes</th><th>Completed</th><th>Median seconds</th><th>Reported tokens</th><th>Estimated USD</th></tr></thead><tbody>${rows}</tbody></table></div>${chart}<div class="grid">${panels}</div><h2>Same-model uplift</h2>${uplift}<h2>Observed streaming</h2>${timing}<p>Streaming measurements are SDK observations, not server-attested TTFT. Throughput uses native reported tokens and is approximate, not normalized across tokenizers.</p><p>${htmlEscape(summary.interpretation)}</p><small>Protocol ${htmlEscape(summary.protocolHash)}. Category-balanced scores retain planned failures. Generated validation is not a sealed external holdout. Provider identity, reasoning, tools and budgets are recorded in the frozen protocol and receipts.</small></html>`;
}
