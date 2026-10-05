import {readFileSync,writeFileSync,mkdirSync,cpSync,existsSync,rmSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {command,dockerRun,startRelay,treeHashes,sha} from '../official-bench/run.mjs';
import {freezeIndexProtocol,verifyIndexProtocol,scoreResearchIndex,renderIndexReport,indexDomains} from '../../dist/research-index.js';
import {hash} from '../../dist/storage.js';
const here=dirname(fileURLToPath(import.meta.url));
const runtimeSources=()=>({sharedRunner:sha(readFileSync(join(here,'../official-bench/run.mjs'))),index:sha(readFileSync(join(here,'../../dist/research-index.js')))});
const save=(path,value)=>writeFileSync(path,JSON.stringify(value,null,2)+'\n',{mode:0o600});
const read=path=>JSON.parse(readFileSync(path,'utf8'));
function numericMatch(a,b) {
 if(typeof b==='number')return typeof a==='number'&&Number.isFinite(a)&&Math.abs(a-b)<=1e-5+1e-5*Math.abs(b);
 if(Array.isArray(b))return Array.isArray(a)&&a.length===b.length&&b.every((v,i)=>numericMatch(a[i],v));
 if(b&&typeof b==='object')return !!a&&typeof a==='object'&&Object.keys(a).length===Object.keys(b).length&&Object.entries(b).every(([k,v])=>numericMatch(a[k],v));
 return a===b;
}
export async function prepare(root,{image='repi-official-pilot:20261005',trials=1,seconds=300,models=['deepseek-v4.1-flash','glm-5.3-flash']}={}) {
 if(process.platform!=='linux')throw Error('Native index calibration currently requires Linux and Docker.');
 if(models.length<2||models.length>8||new Set(models).size!==models.length||models.some(id=>typeof id!=='string'||!/^[a-z0-9][a-z0-9._-]{0,149}$/i.test(id)))throw Error('Choose 2–8 distinct safe OpenCode Go model IDs.');
 root=resolve(root);if(existsSync(root))throw Error('Use a fresh output directory.');
 const revisions=await command(['docker','image','inspect',image,'--format','{{.Id}}']);if(revisions.code!==0)throw Error('Build the scientific CPU runtime first.');
 // Snapshot bibliographic identity only; metadata does not prove scientific claims.
 const registry=[];
 for(const doi of ['10.1111/ectj.12097','10.1038/nature14539','10.1038/s41586-021-03819-2']) {
  const response=await fetch('https://api.crossref.org/works/'+encodeURIComponent(doi),{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('Crossref snapshot failed: '+response.status);
  const m=(await response.json()).message;
  registry.push(Object.fromEntries(['DOI','title','author','issued','container-title','volume','issue','page','publisher','URL'].filter(k=>m[k]!==undefined).map(k=>[k,m[k]])));
 }
 mkdirSync(root,{recursive:true,mode:0o700});save(join(root,'registry.json'),registry);
 const generated=await dockerRun(image,'repi-index-prepare-'+randomUUID(),['-v',`${root}:/pack`,'-v',`${join(here,'prepare.py')}:/prepare.py:ro`,image,'python','/prepare.py','/pack','20261005'],{timeout:120000});
 if(generated.code!==0)throw Error('Task preparation failed: '+generated.err);
 const tasks=read(join(root,'tasks.json'));
 const conditions=models.map(model=>({id:'repi/'+model,harness:'ResearchPi native CLI',revision:revisions.out.trim(),model,provider:'opencode-go',settings:{thinking:'medium',retry:{maxRetries:2},temperature:'native provider default'}}));
 const protocol=freezeIndexProtocol({schemaVersion:1,version:'RAI-development-0.2',phase:'development',reference:conditions[0]?.id,conditions,tasks:tasks.map(({prompt,...task})=>({...task,inputHash:hash(treeHashes(join(root,'inputs',task.id)))})),trials,budgets:{seconds,requests:24,outputTokens:8192},domainWeights:Object.fromEntries(indexDomains.map(d=>[d,.2])),rating:{regularization:.5,tieTolerance:.01,bootstrapSamples:1000,bootstrapSeed:9173},disclosure:'Five public authored development tasks; automated grading plus pending independent expert review. Anchor is a prespecified transport reference, not an established research champion. No sealed holdout, human baseline or competing harness run.'});
 save(join(root,'protocol.json'),protocol);
 save(join(root,'integrity.json'),{inputs:treeHashes(join(root,'inputs')),private:treeHashes(join(root,'private')),tasksHash:sha(readFileSync(join(root,'tasks.json'))),sourceHashes:treeHashes(here),runtimeSources:runtimeSources(),imageId:revisions.out.trim(),registryRetrieved:new Date().toISOString()});
 console.log('Prepared public development pack: '+root);return root;
}
async function assess(root,caseRoot,task,image,trace) {
 const work=join(caseRoot,'work'),expected=read(join(root,'private',task.id+'.json')),answer=existsSync(join(work,'answer.json'))?read(join(work,'answer.json')):{};
 const criteria=Object.fromEntries(Object.entries(expected.expected).map(([k,v])=>[k,numericMatch(answer[k],v)?1:0]));
 const present=name=>existsSync(join(work,name))&&readFileSync(join(work,name)).length>100;
 const replayDetails=[];
 if(task.domain==='reproduction') {
  criteria.scriptExecuted=/"toolName":"bash"/.test(trace)&&/python/.test(trace)&&present('analysis.py')?1:0;
  for(const [criterion,input,answerExpected] of [['freshReplay',join(root,'inputs',task.id,'study.json'),expected.expected],['perturbedInputReplay',join(root,'private','probe.json'),expected.probeExpected]]) {
   const fresh=join(caseRoot,criterion+'-'+randomUUID());mkdirSync(fresh);if(existsSync(join(work,'analysis.py')))cpSync(join(work,'analysis.py'),join(fresh,'analysis.py'));
   const r=await dockerRun(image,'repi-index-replay-'+randomUUID(),['-v',`${fresh}:/work`,'-v',`${input}:/input.json:ro`,image,'python','/work/analysis.py','/input.json'],{timeout:60000});
   let output;try{output=JSON.parse(r.out.trim().split('\n').at(-1));}catch{}
   criteria[criterion]=r.code===0&&numericMatch(output,answerExpected)?1:0;
   replayDetails.push({criterion,exitCode:r.code,stdoutHash:sha(r.out),stderr:r.err.slice(-2000),score:criteria[criterion]});
   save(join(caseRoot,criterion+'.json'),{...r,parsed:output});
  }
 }
 if(task.domain==='experimentation')criteria.protocolArtifactPresent=present('protocol.md')?1:0;
 if(['statistics_causality','literature'].includes(task.domain))criteria.explanationArtifactPresent=present(task.domain==='literature'?'evidence.md':'report.md')?1:0;
 if(task.domain==='scientific_writing') {
  const paper=existsSync(join(work,'paper.md'))?readFileSync(join(work,'paper.md'),'utf8'):'';
  criteria.paperSectionsPresent=['Abstract','Introduction','Related Work','Materials and Methods','Results','Discussion','Conclusion'].every(s=>new RegExp('^#{1,6}\\s+'+s+'\\s*$','mi').test(paper))?1:0;
  const figure=existsSync(join(work,'figure.png'))?readFileSync(join(work,'figure.png')):Buffer.alloc(0);
  criteria.figurePresent=figure.length>200&&figure.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?1:0;
 }
 const unchanged=Object.entries(treeHashes(join(root,'inputs',task.id))).every(([name,digest])=>treeHashes(work)[name]===digest);
 return {answer,criteria,valid:unchanged,replayDetails,notes:'Mechanical artifact checks only; independent expert review pending. Unchanged-input integrity gate: '+unchanged+'. These checks do not establish scientific validity or paper quality.'};
}
export async function verifyPack(root,image) {
 root=resolve(root);
 const tasks=read(join(root,'tasks.json'));const directory=join(root,'reference-checks',randomUUID());mkdirSync(directory,{recursive:true,mode:0o700});const checks=[];
 for(const task of tasks) {
  const expected=read(join(root,'private',task.id+'.json')).expected,caseRoot=join(directory,task.id),work=join(caseRoot,'work');mkdirSync(caseRoot);cpSync(join(root,'inputs',task.id),work,{recursive:true});save(join(work,'answer.json'),expected);
  if(task.domain==='reproduction')cpSync(join(root,'private','reference-analysis.py'),join(work,'analysis.py'));
  if(task.domain==='experimentation')writeFileSync(join(work,'protocol.md'),'UNPAID GRADER FIXTURE. '+ 'Reference artifact contract check only. '.repeat(8));
  if(['statistics_causality','literature'].includes(task.domain))writeFileSync(join(work,task.domain==='literature'?'evidence.md':'report.md'),'UNPAID GRADER FIXTURE. '+ 'Mechanical artifact presence only. '.repeat(8));
  if(task.domain==='scientific_writing') {
   writeFileSync(join(work,'paper.md'),['Abstract','Introduction','Related Work','Materials and Methods','Results','Discussion','Conclusion'].map(h=>'# '+h+'\nUNPAID MECHANICAL FIXTURE.\n').join('\n'));
   const fig=await dockerRun(image,'repi-index-reference-'+randomUUID(),['-v',`${work}:/work`,image,'python','-c','import matplotlib.pyplot as p;p.plot([0,1],[0,1]);p.savefig("/work/figure.png")']);if(fig.code!==0)throw Error('Figure contract reference failed.');
  }
  const grade=await assess(root,caseRoot,task,image,'');
  const required=task.criteria.filter(c=>c!=='scriptExecuted');if(required.some(c=>grade.criteria[c]!==1)||!grade.valid)throw Error('Correct mechanical reference rejected: '+task.id);
  save(join(work,'answer.json'),{});
  const incorrect=await assess(root,caseRoot,task,image,'');if(Object.keys(expected).some(c=>incorrect.criteria[c]!==0))throw Error('Wrong mechanical reference accepted: '+task.id);
  checks.push({task:task.id,correctReferenceAccepted:true,incorrectReferenceRejected:true,referenceReplay:grade.replayDetails,scope:'Mechanical checks only; fixture documents do not validate scientific arguments.'});
 }
 const result={status:'passed',checked:new Date().toISOString(),checks};save(join(directory,'verification.json'),result);return result;
}
export async function run(root,image='repi-official-pilot:20261005') {
 root=resolve(root);const protocol=verifyIndexProtocol(read(join(root,'protocol.json'))),integrity=read(join(root,'integrity.json')),tasks=read(join(root,'tasks.json'));
 if(protocol.phase!=='development'||protocol.conditions.some(c=>c.harness!=='ResearchPi native CLI'))throw Error('This runner supports public native ResearchPi development calibration only, not an unverified holdout or competing harness.');
 const actual=await command(['docker','image','inspect',image,'--format','{{.Id}}']);if(actual.code!==0||actual.out.trim()!==integrity.imageId)throw Error('Use the frozen preparation runtime image.');image=actual.out.trim();
 const check=()=>{if(hash(treeHashes(join(root,'inputs')))!==hash(integrity.inputs)||hash(treeHashes(join(root,'private')))!==hash(integrity.private)||sha(readFileSync(join(root,'tasks.json')))!==integrity.tasksHash||hash(treeHashes(here))!==hash(integrity.sourceHashes)||hash(runtimeSources())!==hash(integrity.runtimeSources))throw Error('Task/evaluator integrity changed after freeze.');};check();
 console.log('Checking mechanical references and wrong-answer rejection before model calls…');
 const referenceVerification=await verifyPack(root,image);check();
 const {connectionRuntime}=await import('../../dist/connections.js');const runtime=await connectionRuntime(),auth=await runtime.getAuth('opencode-go');if(!auth?.auth.apiKey)throw Error('Existing OpenCode Go API key required.');
 const models=protocol.conditions.map(c=>runtime.getModel(c.provider,c.model));if(models.some(m=>!m||m.api!=='openai-completions'||m.baseUrl!=='https://opencode.ai/zen/go/v1'))throw Error('Frozen model transport unavailable.');
 const directory=join(root,'runs',randomUUID());mkdirSync(directory,{recursive:true,mode:0o700});cpSync(join(root,'protocol.json'),join(directory,'protocol.json'));save(join(directory,'runtime.json'),{image,integrity,referenceVerification,models:models.map(m=>({id:m.id,api:m.api,baseUrl:m.baseUrl,cost:m.cost})),started:new Date().toISOString()});
 const network='repi-index-'+randomUUID();const created=await command(['docker','network','create','--internal',network]);if(created.code!==0)throw Error('Cannot create private model relay network.');
 const inspected=await command(['docker','network','inspect',network]);const gateway=JSON.parse(inspected.out)[0].IPAM.Config[0].Gateway;
 const evidence=[];let interrupted=false,activeName;const stop=()=>{interrupted=true;if(activeName)void command(['docker','kill',activeName]);};process.once('SIGINT',stop);process.once('SIGTERM',stop);
 console.log('Research index development run: '+directory);
 try {
  for(let ti=0;ti<tasks.length&&!interrupted;ti++)for(let trial=1;trial<=protocol.trials&&!interrupted;trial++) {
   const task=tasks[ti],order=(ti+trial)%2?[...protocol.conditions]:[...protocol.conditions].reverse();
   for(const condition of order) {
    if(interrupted)break;check();const model=models.find(m=>m.id===condition.model),caseRoot=join(directory,task.id+'--'+condition.model+'--'+trial);mkdirSync(caseRoot);
    const work=join(caseRoot,'work'),state=join(caseRoot,'state');cpSync(join(root,'inputs',task.id),work,{recursive:true});mkdirSync(join(state,'pi'),{recursive:true});mkdirSync(join(work,'.research-pi'),{recursive:true});
    const events=[],relay=await startRelay({apiKey:auth.auth.apiKey,upstream:model.baseUrl,model:model.id,maxRequests:protocol.budgets.requests,maxTokens:protocol.budgets.outputTokens,events,onEvent:()=>save(join(caseRoot,'requests.json'),events)});
    save(join(state,'pi','models.json'),{providers:{'opencode-go':{baseUrl:`http://${gateway}:${relay.port}/${relay.token}/v1`,apiKey:'benchmark-relay-placeholder'}}});
    save(join(state,'pi','settings.json'),{defaultThinkingLevel:'medium',defaultTools:['+grep','+find','+ls','+codemode','+tool_search'],quietStartup:true,enableAnalytics:false,enableInstallTelemetry:false,compaction:{enabled:true,reserveTokens:4096,keepRecentTokens:8192},retry:{enabled:true,maxRetries:2,baseDelayMs:1000}});
    save(join(work,'.research-pi','config.json'),{provider:condition.provider,model:condition.model,authMode:'api_key'});
    const start=Date.now();activeName='repi-index-agent-'+randomUUID();let native;
    console.log('Starting '+task.id+' / '+condition.model+' / attempt '+trial);
    try{native=await dockerRun(image,activeName,['-v',`${work}:/work`,'-v',`${state}:/state`,'-e','RESEARCH_PI_API_KEY=benchmark-relay-placeholder',image,'node','/app/dist/cli.js','--project','/work','chat','--json','--new','benchmark',task.prompt+` Per-attempt wall limit: ${protocol.budgets.seconds} seconds.`],{network,timeout:protocol.budgets.seconds*1000,log:join(caseRoot,'native-trace')});}finally{await relay.close();activeName=undefined;save(join(caseRoot,'requests.json'),events);}
    const seconds=(Date.now()-start)/1000;const errors=native.out.split('\n').flatMap(line=>{try{const e=JSON.parse(line);return e.type==='message_end'&&e.message?.stopReason==='error'?[e.message.errorMessage]:[];}catch{return [];}});
    let grade;try{grade=await assess(root,caseRoot,task,image,native.out);}catch(e){grade={criteria:Object.fromEntries(task.criteria.map(c=>[c,0])),valid:false,notes:'Artifact assessment failed: '+e.message};}
    check();const artifacts=treeHashes(work),receipt={taskId:task.id,conditionId:condition.id,trial,nativeStatus:native.timedOut?'timeout':errors.length?'provider_failed':native.code===0?'completed':'agent_failed',errors,seconds,requests:events.length,requestHash:hash(read(join(caseRoot,'requests.json'))),traceHash:sha(native.out),artifactHashes:artifacts,grade,protocolHash:protocol.protocolHash};save(join(caseRoot,'receipt.json'),receipt);
    const submitted=existsSync(join(work,'answer.json'));
    const item={taskId:task.id,conditionId:condition.id,trial,status:submitted?'completed':native.timedOut?'timeout':'failed',valid:grade.valid,criteria:grade.criteria,receiptHash:hash(receipt),artifactHash:hash(artifacts),review:{kind:'automated',notes:grade.notes+' Native session: '+receipt.nativeStatus+'.'},seconds};
    evidence.push(item);save(join(directory,'evidence.json'),evidence);
    const result=scoreResearchIndex(protocol,evidence);save(join(directory,'index.json'),result);writeFileSync(join(directory,'report.html'),renderIndexReport(result));
    console.log(JSON.stringify({task:task.id,model:condition.model,status:receipt.nativeStatus,criteria:grade.criteria,seconds}));
   }
  }
 }finally{await command(['docker','network','rm',network]);process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);save(join(directory,'run-status.json'),{status:interrupted?'interrupted':evidence.length===tasks.length*protocol.trials*protocol.conditions.length?'complete':'incomplete',finished:new Date().toISOString()});}
 return directory;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
 const [mode,path,image,trials,seconds,modelIds]=process.argv.slice(2);
 if(mode==='prepare')await prepare(path,{image,trials:Number(trials??1),seconds:Number(seconds??300),models:modelIds?.split(',')});
 else if(mode==='run')console.log(await run(path,image));
 else throw Error('Use prepare or run.');
}
