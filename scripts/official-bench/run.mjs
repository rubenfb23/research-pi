// Native CLI evaluation, with credentials and official answers kept off agent mounts.
import {createServer} from 'node:http';
import {createHash,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,cpSync,existsSync,readdirSync,lstatSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {transducerFPower} from '../official-replay-parser.mjs';
import {verifyReferences} from './preflight.mjs';

const scriptDir=dirname(fileURLToPath(import.meta.url));
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function treeHashes(root,prefix='',budget={bytes:0}) {
 const result={};
 for(const name of readdirSync(root).sort()) {
  const path=join(root,name),key=prefix+name,stat=lstatSync(path);
  if(stat.isSymbolicLink()) throw Error('Symlink is not allowed in evaluation artifacts: '+key);
  else if(stat.isDirectory()) Object.assign(result,treeHashes(path,key+'/',budget));
  else if(stat.isFile()) {budget.bytes+=stat.size;if(budget.bytes>512*1024*1024)throw Error('Artifact byte budget exceeded');result[key]=sha(readFileSync(path));}
  else throw Error('Special file is not allowed in evaluation artifacts: '+key);
 }
 return result;
}
function save(path,data) {writeFileSync(path,JSON.stringify(data,null,2)+'\n',{mode:0o600});}
export async function command(args,{timeout=120000,log}={}) {
 return await new Promise((done,reject)=>{
  const p=spawn(args[0],args.slice(1),{stdio:['ignore','pipe','pipe']});
  let out='',err='',timedOut=false;
  p.stdout.on('data',b=>{out+=b; if(log) writeFileSync(log+'.jsonl',b,{flag:'a',mode:0o600});});
  p.stderr.on('data',b=>{err+=b; if(log) writeFileSync(log+'.stderr',b,{flag:'a',mode:0o600});});
  const timer=setTimeout(()=>{timedOut=true;p.kill('SIGTERM');},timeout);
  p.on('error',e=>{clearTimeout(timer);reject(e);});
  p.on('close',code=>{clearTimeout(timer);done({code,timedOut,out,err});});
 });
}
export async function startRelay({apiKey,upstream,model,maxRequests=40,maxTokens=8192,events,onEvent=()=>{}}) {
 const token=randomUUID(); let requests=0,active=0;
 const controllers=new Set();
 const server=createServer(async(req,res)=>{
  const entry={index:++requests,start:new Date().toISOString()};
  if(req.method!=='POST'||req.url!==`/${token}/v1/chat/completions`){requests--;res.writeHead(404).end();return;}
  if(requests>maxRequests){entry.error='request_budget';events.push(entry);onEvent();res.writeHead(429,{'content-type':'application/json'}).end(JSON.stringify({error:{message:'Frozen benchmark request budget exhausted'}}));return;}
  const controller=new AbortController();controllers.add(controller);active++;
  let timer=setTimeout(()=>controller.abort(),180000);
  try {
   let raw='';for await(const b of req){raw+=b;if(raw.length>8*1024*1024)throw Error('Request body limit');}
   const body=JSON.parse(raw);
   if(body.model!==model)throw Error('Model does not match frozen condition');
   if(body.max_completion_tokens!==undefined)body.max_completion_tokens=Math.min(maxTokens,body.max_completion_tokens);
   else body.max_tokens=Math.min(maxTokens,body.max_tokens??maxTokens);
   entry.model=body.model;entry.settings={max_tokens:body.max_tokens,max_completion_tokens:body.max_completion_tokens,temperature:body.temperature,reasoning_effort:body.reasoning_effort,stream:body.stream};
   const nativeHeaders=Object.fromEntries(Object.entries(req.headers).filter(([name,value])=>name.startsWith('x-opencode-')&&typeof value==='string'));
   entry.nativeHeaderNames=Object.keys(nativeHeaders);
   entry.toolNames=(body.tools??[]).map(t=>t.function?.name);
   entry.requestHash=sha(JSON.stringify(body));
   const response=await fetch(upstream+'/chat/completions',{method:'POST',headers:{...nativeHeaders,'authorization':'Bearer '+apiKey,'content-type':'application/json','user-agent':'ResearchPi/1.5.0','x-opencode-client':'ResearchPi'},body:JSON.stringify(body),signal:controller.signal});
   entry.status=response.status;
   res.writeHead(response.status,{'content-type':response.headers.get('content-type')??'application/json','cache-control':'no-cache'});
   let carry='';
   for await(const chunk of response.body){
    res.write(chunk);carry+=Buffer.from(chunk).toString('utf8');
    const lines=carry.split('\n');carry=lines.pop();
    for(const line of lines)if(line.startsWith('data: '))try{const value=JSON.parse(line.slice(6));if(value.usage)entry.usage=value.usage;if(value.model)entry.returnedModel=value.model;}catch{}
   }
   if(!body.stream&&carry)try{const value=JSON.parse(carry);entry.usage=value.usage;entry.returnedModel=value.model;}catch{}
   res.end();
  }catch(e){entry.error=e.name==='AbortError'?'relay_timeout':String(e.message).replaceAll(apiKey,'[redacted]');if(!res.headersSent)res.writeHead(502,{'content-type':'application/json'});res.end(JSON.stringify({error:{message:'Benchmark relay failed'}}));}
  finally{clearTimeout(timer);controllers.delete(controller);active--;entry.end=new Date().toISOString();events.push(entry);onEvent();}
 });
 await new Promise(ok=>server.listen(0,'0.0.0.0',ok));
 return {token,port:server.address().port,get requests(){return requests},get active(){return active},async close(){for(const c of controllers)c.abort();server.closeAllConnections();await new Promise(ok=>server.close(ok));}};
}
function dockerBase(image,name,network='none') {
 return ['docker','run','--rm','--name',name,'--network',network,'--cpus','2','--memory','3g','--memory-swap','3g','--pids-limit','256','--cap-drop','ALL','--security-opt','no-new-privileges','--read-only','--tmpfs','/tmp:rw,size=512m','--tmpfs',`/home/repi:rw,uid=${process.getuid()},size=128m`,'--user',`${process.getuid()}:${process.getgid()}`];
}
let activeContainer;
export async function dockerRun(image,name,args,{timeout=120000,log,network='none'}={}) {
 activeContainer=name;
 let timedOut=false;
 const timer=setTimeout(()=>{timedOut=true;spawn('docker',['kill',name],{stdio:'ignore'});},timeout);
 try{return {...await command([...dockerBase(image,name,network),...args],{timeout:timeout+15000,log}),timedOut};}
 finally{clearTimeout(timer);await command(['docker','rm','-f',name]);activeContainer=undefined;}
}
function parseJson(out) {try{return JSON.parse(out.trim().split('\n').at(-1));}catch{return {error:'Invalid evaluator output'};}}
async function grade(root,caseRoot,task,image) {
 const work=join(caseRoot,'work'),name='repi-grade-'+randomUUID();
 if(task.id==='vectorization') {
  const baseline=join(caseRoot,'baseline');mkdirSync(baseline);cpSync(join(root,'private','baseline.py'),join(baseline,'train.py'));
  const probe=join(scriptDir,'vector-probe.py');
  const run=async path=>{
   const result=await dockerRun(image,name,[ '-v',`${path}:/work:ro`,'-v',`${probe}:/probe.py:ro`,image,'python','/probe.py'],{timeout:180000});
   return result.code===0?parseJson(result.out):{error:'Probe failed',exitCode:result.code,stderr:result.err.slice(-4000)};
  };
  const reference=await run(baseline),candidate=await run(work);
  save(join(caseRoot,'vector-probes.json'),{reference,candidate});
  const equality=(a,b)=>Array.isArray(a)?Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>equality(v,b[i])):Number.isFinite(b)&&Math.abs(a-b)<=1e-8+1e-6*Math.abs(a);
  const correct=!reference.error&&!candidate.error&&equality(reference.outputs,candidate.outputs)&&equality(reference.checksums,candidate.checksums);
  const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
  // Official grader reads the submitted CSV; execute it separately from candidate code.
  const official=await dockerRun(image,name,['-v',`${work}:/submission:ro`,'-v',`${join(root,'private','mlagent-eval.py')}:/eval.py:ro`,image,'python','-c','import runpy; d=runpy.run_path("/eval.py"); print(d["get_score"]("/submission"))']);
  const claimed=Number(official.out.trim());
  const changed=sha(readFileSync(join(work,'train.py')))!==sha(readFileSync(join(baseline,'train.py')));
  return {officialReportedSeconds:Number.isFinite(claimed)?claimed:null,officialGraderExit:official.code,correct,codeChanged:changed,independentBaselineSeconds:reference.seconds?median(reference.seconds):null,independentCandidateSeconds:candidate.seconds?median(candidate.seconds):null,speedup:correct?median(reference.seconds)/median(candidate.seconds):null,success:correct&&changed&&claimed>0&&claimed<1e10&&median(reference.seconds)/median(candidate.seconds)>=1.1,probeError:reference.error??candidate.error??null};
 }
 const official=await dockerRun(image,name,['-v',`${join(root,'private')}:/grader:ro`,'-v',`${work}:/submission:ro`,'-v',`${join(scriptDir,'core-grade.py')}:/grade.py:ro`,image,'python','/grade.py',task.id]);
 const result=parseJson(official.out);save(join(caseRoot,'official-grade-log.json'),official);
 // Fresh replay omits existing results and receives no grader/answers/credentials.
 const replay=join(caseRoot,'replay');cpSync(work,replay,{recursive:true});
 await command(['python3','-c','import pathlib,shutil,sys; p=pathlib.Path(sys.argv[1]); shutil.rmtree(p/"results",ignore_errors=True); shutil.rmtree(p/".research-pi",ignore_errors=True); (p/"results").mkdir()',replay]);
 let reproduction={status:'missing_reproduce_script'};
 if(existsSync(join(replay,'reproduce.sh'))) {
  const r=await dockerRun(image,name,['-v',`${replay}:/work`,image,'bash','/work/reproduce.sh'],{timeout:600000,log:join(caseRoot,'replay-output')});
  reproduction={status:r.timedOut?'timeout':r.code===0?'completed':'failed',exitCode:r.code,outputHash:sha(r.out),secondsLimit:600};
  if(task.id==='capsule-8610546') {
   const output=join(replay,'results','results_model_based_robust_stabilization_experiment.txt');
   if(existsSync(output)){const match=readFileSync(output,'utf8').match(/^optimal\s+[-+\d.]+\s+([-+\d.eE]+)/m);reproduction.measuredValue=match?Number(match[1]):null;}
  } else {
   reproduction.measuredValue=transducerFPower(r.out);
  }
  const taskGold=JSON.parse(readFileSync(join(root,'private',task.id+'.json')));const question=Object.keys(taskGold.results[0])[0];
  const reported=existsSync(join(work,'submission.json'))?JSON.parse(readFileSync(join(work,'submission.json'))):{};
  reproduction.matchesSubmission=Number.isFinite(reproduction.measuredValue)&&Math.abs(reproduction.measuredValue-Number(reported[question]))<=Math.max(1e-6,Math.abs(reproduction.measuredValue)*1e-5);
 }
 return {official:result,reproduction,success:result.all_correct===true&&reproduction.status==='completed'&&reproduction.matchesSubmission===true};
}
export async function main(root,image='repi-official-pilot:20261005') {
 if(process.platform!=='linux')throw Error('This experimental Docker CPU evaluator currently requires Linux.');
 root=resolve(root);
 const protocol=JSON.parse(readFileSync(join(root,'protocol.json'))),tasks=JSON.parse(readFileSync(join(root,'tasks.json')));
 if(JSON.stringify(treeHashes(join(root,'inputs')))!==JSON.stringify(protocol.taskFiles)||JSON.stringify(treeHashes(join(root,'private')))!==JSON.stringify(protocol.graderFiles))throw Error('Input or grader hash mismatch');
 for(const task of tasks)if(sha(task.prompt)!==protocol.prompts[task.id])throw Error('Prompt hash mismatch');
 const {connectionRuntime}=await import('../../dist/connections.js');
 const runtime=await connectionRuntime(),auth=await runtime.getAuth('opencode-go');
 if(!auth?.auth.apiKey)throw Error('Existing OpenCode Go API key is required');
 const models=protocol.condition.models.map(id=>runtime.getModel('opencode-go',id));
 if(models.some(m=>!m||m.api!=='openai-completions'||m.baseUrl!=='https://opencode.ai/zen/go/v1'))throw Error('Provider catalog does not match verified transport');
 const imageResult=await command(['docker','image','inspect',image,'--format','{{.Id}}']);if(imageResult.code!==0)throw Error('Build the pinned image first');
 console.log('Verifying original references and official graders before model calls…');
 const referenceVerification=await verifyReferences(root,imageResult.out.trim());
 const runRoot=join(root,'runs',randomUUID());mkdirSync(runRoot,{recursive:true,mode:0o700});
 // Runtime contains package-manager symlinks; fingerprint its locked dependencies,
 // built code and research resources rather than traversing executable links.
 const frozen={...protocol,imageId:imageResult.out.trim(),referenceVerification,replayParserHash:sha(readFileSync(join(scriptDir,'../official-replay-parser.mjs'))),evaluatorFiles:treeHashes(scriptDir),models:models.map(({id,api,baseUrl,reasoning,cost,contextWindow,maxTokens})=>({id,api,baseUrl,reasoning,cost,contextWindow,maxTokens})),runtimeFiles:{...treeHashes(join(root,'image','app','dist')),resources:treeHashes(join(root,'image','app','resources')),lockfile:sha(readFileSync(join(root,'image','app','package-lock.json')))},started:new Date().toISOString()};save(join(runRoot,'frozen-protocol.json'),frozen);
 image=frozen.imageId;
 const network='repi-bench-'+randomUUID();await command(['docker','network','create','--internal',network]);
 const inspect=await command(['docker','network','inspect',network]);const gateway=JSON.parse(inspect.out)[0].IPAM.Config[0].Gateway;
 const attempts=[];let stopped=false;const stop=()=>{stopped=true;if(activeContainer)spawn('docker',['kill',activeContainer],{stdio:'ignore'});};process.once('SIGINT',stop);process.once('SIGTERM',stop);
 console.log('Run: '+runRoot);
 try {
  for(let taskIndex=0;taskIndex<tasks.length&&!stopped;taskIndex++) {
   const task=tasks[taskIndex],order=taskIndex%2?[...models].reverse():models;
   for(const model of order) {
    if(stopped)break;
    const id=task.id+'--'+model.id,caseRoot=join(runRoot,id);mkdirSync(caseRoot,{mode:0o700});
    const work=join(caseRoot,'work'),state=join(caseRoot,'state');cpSync(join(root,'inputs',task.id),work,{recursive:true});mkdirSync(join(state,'pi'),{recursive:true});mkdirSync(join(work,'.research-pi'),{recursive:true});
    const events=[];const relay=await startRelay({apiKey:auth.auth.apiKey,upstream:model.baseUrl,model:model.id,maxRequests:40,events,onEvent:()=>save(join(caseRoot,'requests.json'),events)});
    save(join(state,'pi','models.json'),{providers:{'opencode-go':{baseUrl:`http://${gateway}:${relay.port}/${relay.token}/v1`,apiKey:'benchmark-relay-placeholder'}}});
    save(join(state,'pi','settings.json'),{defaultThinkingLevel:'medium',defaultTools:['+grep','+find','+ls','+codemode','+tool_search'],enableSkillCommands:true,quietStartup:true,enableAnalytics:false,enableInstallTelemetry:false,compaction:{enabled:true,reserveTokens:4096,keepRecentTokens:8192},retry:{enabled:true,maxRetries:2,baseDelayMs:1000}});
    save(join(work,'.research-pi','config.json'),{provider:'opencode-go',model:model.id,authMode:'api_key'});
    const started=Date.now(),name='repi-agent-'+randomUUID();console.log('Starting '+id);
    const result=await dockerRun(image,name,['-v',`${work}:/work`,'-v',`${state}:/state`,'-e','RESEARCH_PI_API_KEY=benchmark-relay-placeholder',image,'node','/app/dist/cli.js','--project','/work','chat','--json','--new','benchmark',task.prompt],{timeout:600000,log:join(caseRoot,'native-trace'),network});
    await relay.close();save(join(caseRoot,'requests.json'),events);
    const errors=result.out.split('\n').flatMap(line=>{try{const e=JSON.parse(line);return e.type==='message_end'&&e.message?.role==='assistant'&&e.message.stopReason==='error'?[e.message.errorMessage]:[];}catch{return [];}});
    const attempt={id,task:task.id,suite:task.suite,model:model.id,requestedReasoning:'medium',seconds:(Date.now()-started)/1000,exitCode:result.code,status:result.timedOut?'timeout':errors.length?'provider_failed':result.code===0?'completed':'agent_failed',providerErrors:errors,requests:events.length,usage:events.reduce((a,e)=>({input:a.input+(e.usage?.prompt_tokens??0),output:a.output+(e.usage?.completion_tokens??0)}),{input:0,output:0})};
    try{attempt.artifactHashes=treeHashes(work);attempt.grade=stopped?{success:false,error:'Run interrupted'}:await grade(root,caseRoot,task,image);}catch(e){attempt.grade={success:false,error:e.message};}
    attempts.push(attempt);save(join(caseRoot,'result.json'),attempt);save(join(runRoot,'results.json'),{frozenProtocolHash:sha(readFileSync(join(runRoot,'frozen-protocol.json'))),attempts,status:'running'});
    console.log(JSON.stringify({id,status:attempt.status,seconds:attempt.seconds,requests:attempt.requests,grade:attempt.grade}));
   }
  }
 }finally {
  await command(['docker','network','rm',network]);process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);
  save(join(runRoot,'results.json'),{frozenProtocolHash:sha(readFileSync(join(runRoot,'frozen-protocol.json'))),attempts,status:stopped?'interrupted':'complete',finished:new Date().toISOString()});
 }
 return runRoot;
}
if(process.argv[1]===fileURLToPath(import.meta.url))await main(process.argv[2],process.argv[3]);
