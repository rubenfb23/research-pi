import {spawn,spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdirSync,readFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT,resource,stateDir} from './paths.js';
import {hash,readJson,writeJson} from './storage.js';
import {codeFingerprint} from './protocol.js';
import {selectedConfig} from './connections.js';

export interface BenchTask {id:string;category:string;input:unknown;instruction:string;expected:Record<string,unknown>;}
export interface BenchOptions {agent:'repi'|'claude'|'codex'|'fixture';trials?:number;tasks?:string[];model?:string;provider?:string;timeoutSeconds?:number;mode?:'product'|'same-model';condition?:string;budgetUsd?:number;continueOnError?:boolean;}
export function benchTasks():BenchTask[] {return readJson<{tasks:BenchTask[]}>(resource('bench/tasks.json')).tasks;}
export function parseAnswer(value:string):Record<string,unknown> {
 const text=value.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');const answer=JSON.parse(text);
 if(!answer || Array.isArray(answer) || typeof answer!=='object') throw new Error('Answer must be a JSON object');return answer;
}
export function gradeAnswer(task:BenchTask,answer:Record<string,unknown>) {
 const errors=Object.entries(task.expected).flatMap(([key,expected])=>{
   const actual=answer[key],matches=typeof expected==='number' ? typeof actual==='number' && Number.isFinite(actual) && Math.abs(actual-expected)<1e-9 : hash(actual)===hash(expected);
   return matches ? [] : [`Incorrect or missing field: ${key}`];
 });return {passed:errors.length===0,errors};
}
function command(executable:string,args:string[],cwd:string,timeout:number,signal?:AbortSignal):Promise<{stdout:string;stderr:string;exitCode:number|null;interrupted:boolean}> {
 return new Promise((resolve,reject)=>{
  signal?.throwIfAborted();const child=spawn(executable,args,{cwd,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});
  let stdout='',stderr='',interrupted=false,killTimer:NodeJS.Timeout|undefined;
  const kill=(force=false)=>{try{if(process.platform==='win32') child.kill(force?'SIGKILL':'SIGTERM');else if(child.pid) process.kill(-child.pid,force?'SIGKILL':'SIGTERM');}catch{}};
  const stop=()=>{if(interrupted)return;interrupted=true;kill();killTimer=setTimeout(()=>kill(true),1500);};
  signal?.addEventListener('abort',stop,{once:true});const timer=setTimeout(stop,timeout);
  child.stdout.on('data',data=>{stdout+=data;if(stdout.length>4_000_000) stop();});
  child.stderr.on('data',data=>{stderr+=data;if(stderr.length>1_000_000) stop();});
  const cleanup=()=>{clearTimeout(timer);if(killTimer)clearTimeout(killTimer);signal?.removeEventListener('abort',stop);};
  child.once('error',error=>{cleanup();reject(error);});child.once('close',exitCode=>{cleanup();resolve({stdout:stdout.slice(0,4_000_000),stderr:stderr.slice(0,1_000_000),exitCode,interrupted});});
 });
}
function jsonLines(text:string):any[] {return text.split('\n').flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});}
export async function runBenchmark(project:string,options:BenchOptions,signal?:AbortSignal) {
 const trials=options.trials??10,timeout=options.timeoutSeconds??60,budget=options.budgetUsd??0.25;
 if(!['repi','claude','codex','fixture'].includes(options.agent) || !Number.isInteger(trials)||trials<1||trials>10 || !Number.isInteger(timeout)||timeout<1||timeout>300 || !Number.isFinite(budget)||budget<=0||budget>10) throw new Error('Use a supported agent, 1–10 trials, a 1–300 second timeout and per-trial budget up to $10');
 if(options.mode==='same-model' && !options.model) throw new Error('A same-model condition requires an explicit model ID; matching other runs is the researcher\'s responsibility.');
 const tasks=benchTasks().filter(t=>!options.tasks || options.tasks.includes(t.id));
 if(!tasks.length || options.tasks?.some(id=>!tasks.some(t=>t.id===id))) throw new Error('Unknown or empty benchmark task selection');
 const id=randomUUID(),directory=join(stateDir(project),'benchmarks',id);mkdirSync(directory,{recursive:true,mode:0o700});
 const config=selectedConfig(project);
 const agentVersion=options.agent==='fixture'?'reference-fixture':options.agent==='repi'?readJson<{version:string}>(join(ROOT,'package.json')).version:spawnSync(options.agent,['--version'],{encoding:'utf8',timeout:10000}).stdout?.trim()||'unavailable';
 const instructionHashes:Record<string,string>=Object.fromEntries(['system.md','manuscript-policy.md','web-policy.md'].map(name=>[name,hash(readFileSync(resource(name),'utf8'))]));
 const body={id,instructionHashes,createdAt:new Date().toISOString(),options:Object.fromEntries(Object.entries({...options,trials,timeoutSeconds:timeout,budgetUsd:budget}).filter(([,value])=>value!==undefined)),tasks,codeHash:codeFingerprint(),agentVersion,
   host:{platform:process.platform,architecture:process.arch,node:process.versions.node},
   requestedModel:options.model??(options.agent==='repi'?config?.model:null)??'agent-default',requestedProvider:options.provider??(options.agent==='repi'?config?.provider:null),
   laboratoryPolicy:'Ten predefined training seeds per stochastic training configuration. Distinguish fixed split/data seeds; preserve failures and original measurements. Use evidence for claims; do not invent citations or causal identification.',
   scope:'Twenty synthetic JSON microtasks; no end-to-end research-quality or superiority claim. Trial IDs are independent repetitions, not controlled model seeds.',
   controls:'Fresh project per trial; equivalent task inputs and shared laboratory instruction. Native tools/settings differ across products and are recorded, not assumed equal.',
   limits:'Wall-clock limit enforced. Claude API dollar cap is requested through its CLI; no universal token, dollar or tool-isolation cap is claimed. Account usage and model access depend on existing authentication.'};
 const protocol={...body,protocolHash:hash(body)};writeJson(join(directory,'protocol.json'),protocol);
 const receipts:any[]=[];
 trialLoop: for(const task of tasks) for(let trial=1;trial<=trials;trial++) {
  if(signal?.aborted) break;
  if(codeFingerprint()!==protocol.codeHash || ['system.md','manuscript-policy.md','web-policy.md'].some(name=>hash(readFileSync(resource(name),'utf8'))!==protocol.instructionHashes[name])) throw new Error('Code or instructions changed during benchmark');
  const trialDir=join(directory,task.id+'-'+trial);mkdirSync(trialDir,{recursive:true,mode:0o700});
  const prompt=protocol.laboratoryPolicy+'\nThis is an independent, closed-input research microtask. Use only the supplied evidence, do not seek a grader or reference solution, and do not delegate. Return only a JSON object.\n'+task.instruction+'\n'+JSON.stringify(task.input);
  writeJson(join(trialDir,'request.json'),{taskId:task.id,trial,prompt});
  const started=Date.now();let text='',trace:unknown=null,usage:unknown=null,actualModel:string|null=null,status='completed',error:string|null=null,argv:string[]=[],errorCategory:string|null=null;
  try {
   if(options.agent==='fixture') {text=JSON.stringify(task.expected);trace={fixture:true};}
   else {
    let executable=options.agent as string;
    if(options.agent==='repi') {
     executable=process.execPath;
     if(options.model || config) writeJson(join(stateDir(trialDir),'config.json'),{provider:options.provider??config?.provider,model:options.model??config?.model});
     argv=[join(ROOT,'dist/cli.js'),'--project',trialDir,'chat','--json',prompt];
    } else if(options.agent==='claude') argv=['-p','--output-format','json','--no-session-persistence','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--tools','','--setting-sources','','--max-turns','2','--max-budget-usd',String(budget),...(options.model?['--model',options.model]:[]),prompt];
    else argv=['--ask-for-approval','never','exec','--skip-git-repo-check','--ephemeral','--sandbox','read-only','--json','--output-last-message',join(trialDir,'answer.txt'),...(options.model?['--model',options.model]:[]),prompt];
    const result=await command(executable,argv,trialDir,timeout*1000,signal);trace=result;
    if(result.interrupted || result.exitCode!==0) {
      const failureText=result.stdout+' '+result.stderr;errorCategory=result.interrupted?'timeout_or_cancelled':/oauth|authenticate|authentication|login|unauthorized|expired/i.test(failureText)?'authentication':/not supported|model.*not found|model_not_found/i.test(failureText)?'model_access':'agent_failure';
      throw new Error(result.interrupted?'Trial interrupted or timed out':`Agent exited with status ${result.exitCode} (${errorCategory})`);
    }
    if(options.agent==='claude') {const output=JSON.parse(result.stdout);text=output.result??'';usage={tokens:output.usage??null,costUsd:output.total_cost_usd??null};actualModel=Object.keys(output.modelUsage??{})[0]??null;if(output.is_error) throw new Error('Claude returned an error result');}
    else if(options.agent==='codex') {text=readFileSync(join(trialDir,'answer.txt'),'utf8');const events=jsonLines(result.stdout);usage=events.find(e=>e.type==='turn.completed')?.usage??null;actualModel=null;}
    else {const events=jsonLines(result.stdout),message=events.filter(e=>e.type==='message_end' && e.message?.role==='assistant').at(-1)?.message;
     if(!message || ['error','aborted'].includes(message.stopReason)) {errorCategory='provider_response';throw new Error('Provider did not return a completed assistant response');}
     text=message?.content?.filter((c:any)=>c.type==='text').map((c:any)=>c.text).join('')??'';usage=message?.usage??null;actualModel=message?.model??null;}
   }
   if(codeFingerprint()!==protocol.codeHash || Object.entries(protocol.instructionHashes).some(([name,digest])=>hash(readFileSync(resource(name),'utf8'))!==digest)) {errorCategory='configuration_changed';throw new Error('Code or instructions changed during trial');}
  } catch(e) {status=signal?.aborted?'cancelled':'failed';error=(e as Error).message;}
  let grade={passed:false,errors:['No completed answer']};
  if(status==='completed') try{grade=gradeAnswer(task,parseAnswer(text));}catch{grade={passed:false,errors:['Answer is not a single valid JSON object']};}
  const receiptBody={taskId:task.id,category:task.category,trial,status,error,errorCategory,agent:options.agent,actualModel,usage,durationSeconds:(Date.now()-started)/1000,answer:text,grade,protocolHash:protocol.protocolHash,
    traceHash:hash(trace),command:argv};
  const receipt={...receiptBody,receiptHash:hash(receiptBody)};
  writeJson(join(trialDir,'trace.json'),trace);writeJson(join(trialDir,'receipt.json'),receipt);receipts.push(receipt);
  console.error(`${options.agent} ${task.id} trial=${trial}: ${status}; ${grade.passed?'passed':'failed grading'}`);
  if(status!=='completed' && !options.continueOnError) break trialLoop;
 }
 const summary={id,directory,agent:options.agent,protocolHash:protocol.protocolHash,fixtureOnly:options.agent==='fixture',expectedTrials:tasks.length*trials,
   completedTrials:receipts.filter(r=>r.status==='completed').length,passedTrials:receipts.filter(r=>r.grade.passed).length,
   status:signal?.aborted?'cancelled':receipts.length===tasks.length*trials && receipts.every(r=>r.status==='completed')?'complete':'incomplete',
   categories:Object.fromEntries([...new Set(tasks.map(t=>t.category))].map(category=>{const rs=receipts.filter(r=>r.category===category);return [category,{trials:rs.length,passed:rs.filter(r=>r.grade.passed).length,failures:rs.filter(r=>r.status!=='completed').length}];})),
   receiptHashes:receipts.map(r=>r.receiptHash),scope:protocol.scope,
   interpretation:options.agent==='fixture'?'Infrastructure smoke only; these answers are stored references, not model responses.':'Observed results for this configuration and microtask suite; models/tools may differ. Broader research judgment remains unmeasured.'};
 writeJson(join(directory,'summary.json'),summary);return summary;
}


export function auditBenchmark(project:string,id:string) {
 if(!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Provide a benchmark run ID');
 const directory=join(stateDir(project),'benchmarks',id),protocol=readJson<any>(join(directory,'protocol.json'));
 const {protocolHash,...body}=protocol,errors:string[]=[];
 if(hash(body)!==protocolHash || protocol.id!==id) throw new Error('Benchmark protocol hash changed');
 const planned=new Set<string>();let completed=0,passed=0;const hashes:string[]=[];
 for(const task of protocol.tasks as BenchTask[]) {
  if(!/^[a-z0-9-]+$/.test(task.id)) throw new Error('Invalid benchmark task ID');
  for(let trial=1;trial<=protocol.options.trials;trial++) {
   const name=task.id+'-'+trial;planned.add(name);
   try {
    const receipt=readJson<any>(join(directory,name,'receipt.json')),trace=readJson<unknown>(join(directory,name,'trace.json'));
    const {receiptHash,...receiptBody}=receipt;
    if(hash(receiptBody)!==receiptHash || hash(trace)!==receipt.traceHash || receipt.protocolHash!==protocolHash || receipt.taskId!==task.id || receipt.trial!==trial) {errors.push(name+': evidence hash/identity mismatch');continue;}
    const expectedPrompt=protocol.laboratoryPolicy+'\nThis is an independent, closed-input research microtask. Use only the supplied evidence, do not seek a grader or reference solution, and do not delegate. Return only a JSON object.\n'+task.instruction+'\n'+JSON.stringify(task.input);
    const request=readJson<any>(join(directory,name,'request.json'));
    if(request.taskId!==task.id || request.trial!==trial || request.prompt!==expectedPrompt) errors.push(name+': task input changed');
    hashes.push(receiptHash);
    if(receipt.status!=='completed') {errors.push(name+': '+receipt.status);continue;}
    completed++;
    let grade;try {grade=gradeAnswer(task,parseAnswer(receipt.answer));}catch {grade={passed:false,errors:['Answer is not a single valid JSON object']};}
    if(hash(grade)!==hash(receipt.grade)) errors.push(name+': stored grade differs from recalculation');
    if(grade.passed) passed++;
   }catch {errors.push(name+': missing or unreadable trial evidence');}
  }
 }
 for(const name of readdirSync(directory,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name)) if(!planned.has(name)) errors.push('Unplanned trial directory: '+name);
 const summary=readJson<any>(join(directory,'summary.json'));
 if(summary.protocolHash!==protocolHash || summary.expectedTrials!==planned.size || summary.completedTrials!==completed || summary.passedTrials!==passed || hash(summary.receiptHashes)!==hash(hashes)) errors.push('Summary differs from recalculated trial evidence');
 return {id,status:errors.length?'incomplete':'complete',errors,expectedTrials:planned.size,completedTrials:completed,passedTrials:passed,fixtureOnly:protocol.options.agent==='fixture',scope:'Local consistency and grader recalculation only; no general research quality or adversarial-proof claim.'};
}
