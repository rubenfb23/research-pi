import {join} from 'node:path';
import {existsSync,mkdirSync,readFileSync} from 'node:fs';
import {createAgentSessionFromServices,createAgentSessionServices,SettingsManager,SessionManager,type ModelRuntime} from '@earendil-works/pi-coding-agent';
import {connectionRuntime} from './connections.js';
import {researchSystemPrompt} from './prompts.js';
import {researchTools} from './tools.js';
import {workspaceTools} from './research-bench-tools.js';
import {hash,readJson,writeJson} from './storage.js';
import {researchMetricTools} from './research-metrics.js';
import {thinkingLevels,type ThinkingLevel} from './preferences.js';

export const researchHarnesses=['pi','pi-research','repi'] as const;
export type ResearchHarness=typeof researchHarnesses[number];
export interface ResearchWorkerConfig {
 harness:ResearchHarness;provider:string;model:string;workspace:string;output:string;prompt:string;protectedFiles:string[];python:boolean;
 maxRequests:number;maxOutputTokens:number;maxReportedTokens:number;thinking:ThinkingLevel;temperature:number;
}
export async function runResearchWorker(config:ResearchWorkerConfig,providedRuntime?:ModelRuntime) {
 const runtime=providedRuntime??await connectionRuntime();
 const model=runtime.getModel(config.provider,config.model);
 if(!model || !await runtime.checkAuth(config.provider)) throw new Error('Model or provider credentials unavailable.');
 const agentDir=join(config.workspace,'.pi-isolated');mkdirSync(agentDir,{recursive:true});
 const settings=SettingsManager.inMemory({retry:{enabled:false,maxRetries:0},compaction:{enabled:false},enableAnalytics:false,enableInstallTelemetry:false});
 const common=workspaceTools(config.workspace,new Set(config.protectedFiles),config.python);
 const extra=config.harness==='repi' ? [...researchTools(config.workspace).filter(tool=>['project_status','search_library','get_scientific_note','get_scientific_protocol','review_causal_plan','paper_outline','venue_profiles'].includes(tool.name)),...researchMetricTools()] : [];
 const tools=[...common,...extra];
 const services=await createAgentSessionServices({cwd:config.workspace,agentDir,modelRuntime:runtime,settingsManager:settings,resourceLoaderOptions:{
  noExtensions:true,noSkills:true,noContextFiles:true,noPromptTemplates:true,noThemes:true,
  ...(config.harness!=='pi' ? {systemPromptOverride:()=>researchSystemPrompt()} : {}),
 }});
 const {session}=await createAgentSessionFromServices({services,sessionManager:SessionManager.inMemory(config.workspace),model,thinkingLevel:config.thinking,tools:tools.map(t=>t.name),customTools:tools});
 await session.bindExtensions({});
 const metadata={harness:config.harness,requestedModel:config.model,requestedProvider:config.provider,
  resolvedModel:session.model?.id,resolvedProvider:session.model?.provider,api:session.model?.api,
  endpoint:session.model?.baseUrl,reasoningRequested:config.thinking,reasoningResolved:session.thinkingLevel,
  tools:session.getActiveToolNames().sort(),systemPromptHash:hash(session.systemPrompt),systemPrompt:session.systemPrompt,
  temperatureRequested:config.temperature,maxOutputTokensRequested:config.maxOutputTokens,
  configuration:'Controlled Pi SDK profile; user extensions, project instructions, skills, MCP and native host tools disabled. Not an untouched product CLI.',
 };
 writeJson(join(config.output,'metadata.json'),metadata);
 const events:unknown[]=[],observedModels=new Set<string>(),latencies:{firstDeltaMs:number|null;lastDeltaMs:number|null;firstTextMs:number|null;outputTokens:number;estimatedOutputTokensPerSecond:number|null}[]=[];
 let requests=0,reportedTokens=0,catalogCostUsd=0,stopReason:string|null=null,requestStarted=0;
 session.subscribe(event=>{
  events.push(event);
  if(event.type==='message_update'&&['text_delta','thinking_delta','toolcall_delta'].includes(event.assistantMessageEvent.type)) {
   const sample=latencies.at(-1);if(sample){const elapsed=performance.now()-requestStarted;sample.firstDeltaMs??=elapsed;sample.lastDeltaMs=elapsed;if(event.assistantMessageEvent.type==='text_delta')sample.firstTextMs??=elapsed;}
  }
  if(event.type==='message_end' && event.message.role==='assistant') {
   observedModels.add(event.message.provider+'/'+event.message.model);
   reportedTokens+=event.message.usage.totalTokens;catalogCostUsd+=event.message.usage.cost.total;
   const sample=latencies.at(-1);if(sample){sample.outputTokens=event.message.usage.output;const span=(sample.lastDeltaMs??0)-(sample.firstDeltaMs??0);sample.estimatedOutputTokensPerSecond=span>0?sample.outputTokens/(span/1000):null;}
  }
 });
 const stream=session.agent.streamFunction;
 session.agent.streamFunction=(active,context,options)=>{
  if(requests>=config.maxRequests) {stopReason='request_limit';throw new Error('Benchmark request limit reached.');}
  if(reportedTokens>=config.maxReportedTokens) {stopReason='reported_token_limit';throw new Error('Benchmark reported-token threshold reached.');}
  requests++;
  requestStarted=performance.now();latencies.push({firstDeltaMs:null,lastDeltaMs:null,firstTextMs:null,outputTokens:0,estimatedOutputTokensPerSecond:null});
  return stream(active,context,{...options,temperature:config.temperature,maxTokens:Math.min(config.maxOutputTokens,config.maxReportedTokens-reportedTokens)});
 };
 try {
  await session.prompt(config.prompt);
  const last=session.messages.filter(m=>m.role==='assistant').at(-1);
  if(!last || last.role!=='assistant' || ['error','aborted'].includes(last.stopReason)) throw new Error('No completed provider response.');
  const response=last.content.filter(c=>c.type==='text').map(c=>c.text).join('');
  writeJson(join(config.output,'result.json'),{status:stopReason?'failed':'completed',response,requests,reportedTokens,catalogCostUsd,observedModels:[...observedModels],stopReason,latencies,usageScope:'SDK usage and catalog-priced cost; not independently verified billing. Token threshold is checked between requests and can be exceeded by an in-flight response. First delta is observed SDK semantic streaming latency, not server-attested TTFT; first text is distinct. Throughput uses reported output tokens over observed delta span and is approximate.'});
 } catch {
  writeJson(join(config.output,'result.json'),{status:'failed',requests,reportedTokens,catalogCostUsd,observedModels:[...observedModels],latencies,stopReason:stopReason??'provider_or_session_failure'});
 } finally {writeJson(join(config.output,'events.json'),events);session.dispose();}
}
if(process.argv[1]?.endsWith('research-bench-worker.js')) {
 const file=process.argv[2];
 if(!file || !existsSync(file)) throw new Error('A worker configuration file is required.');
 const config=readJson<ResearchWorkerConfig>(file);
 if(!researchHarnesses.includes(config.harness)||!thinkingLevels.includes(config.thinking)) throw new Error('Unknown controlled harness profile or effort.');
 await runResearchWorker(config);
}
