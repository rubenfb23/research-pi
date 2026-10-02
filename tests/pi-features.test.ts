import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { spawnSync } from 'node:child_process';
import { SessionManager, type ModelRuntime } from '@earendil-works/pi-coding-agent';
import { type AssistantMessage } from '@earendil-works/pi-ai';
import { createAssistantMessageEventStream } from '@earendil-works/pi-ai/utils/event-stream';
import { openResearchSession, mockConfig } from '../src/agent.js';
import { Conversations, conversationDirectory } from '../src/conversations.js';
import { ROOT, resource, stateDir } from '../src/paths.js';
import { writeJson } from '../src/storage.js';

function fixture() {
  const directory=mkdtempSync(join(tmpdir(),'repi-capabilities-'));
  const original=process.env.RESEARCH_PI_DATA_DIR;
  process.env.RESEARCH_PI_DATA_DIR=join(directory,'data');
  const project=join(directory,'project');mkdirSync(project);
  return {directory,project,cleanup(){if(original===undefined)delete process.env.RESEARCH_PI_DATA_DIR;else process.env.RESEARCH_PI_DATA_DIR=original;rmSync(directory,{recursive:true,force:true});}};
}
function toolContent(session:Awaited<ReturnType<typeof openResearchSession>>,name:string) {
  const item=session.session.messages.filter(message=>message.role==='toolResult' && message.toolName===name).at(-1);
  assert(item && item.role==='toolResult');assert.equal(item.isError,false,JSON.stringify(item.content));return JSON.stringify(item.content);
}

test('Native Pi tools execute actual file mutations, shell code and codemode with retained tool evidence',async()=>{
  const f=fixture(),opened=await openResearchSession(f.project,mockConfig);
  try {
    assert.equal(opened.session.autoCompactionEnabled,true);assert.equal(opened.session.autoRetryEnabled,true);
    await opened.session.prompt('[tool:write] '+JSON.stringify({path:'analysis.mjs',content:'console.log(JSON.stringify({seeds:[11,23,37,41,53,67,79,83,97,101],sum:55}));\n'}));
    await opened.session.prompt('[tool:edit] '+JSON.stringify({path:'analysis.mjs',oldText:'sum:55',newText:'sum:56'}));
    await opened.session.prompt('[tool:read] '+JSON.stringify({path:'analysis.mjs'}));assert.match(toolContent(opened,'read'),/sum:56/);
    const command=JSON.stringify(process.execPath)+' analysis.mjs';
    await opened.session.prompt('[tool:bash] '+JSON.stringify({command}));assert.match(toolContent(opened,'bash'),/sum.*56/);
    await opened.session.prompt('[tool:codemode] '+JSON.stringify({code:'const value = await tools.read({path:"analysis.mjs"}); text(value);'}));
    assert.match(toolContent(opened,'codemode'),/sum:56/);
    assert.match(readFileSync(opened.session.sessionFile!,'utf8'),/toolResult/);
  } finally {await opened.dispose();f.cleanup();}
});

test('Project skills, templates, extensions, themes and AGENTS instructions load and reload through the actual SDK',async()=>{
  const f=fixture();
  for(const dir of ['skills/fixture-method','prompts','extensions','themes'])mkdirSync(join(f.project,'.pi',dir),{recursive:true});
  writeFileSync(join(f.project,'AGENTS.md'),'Workspace instruction: retain the fixture source revision.\n');
  writeFileSync(join(f.project,'.pi/skills/fixture-method/SKILL.md'),'---\nname: fixture-method\ndescription: Verify a fixture methodology\n---\nFixture method content: preserve uncertainty for $ARGUMENTS.\n');
  writeFileSync(join(f.project,'.pi/prompts/methods.md'),'---\ndescription: Draft a fixture methodology\n---\nDraft fixture methods for $1.\n');
  writeFileSync(join(f.project,'.pi/extensions/fixture.js'),`export default pi => pi.registerTool({name:'fixture_echo',label:'Fixture echo',description:'Return a fixture execution marker',parameters:{type:'object',properties:{}},async execute(){return {content:[{type:'text',text:'Executed loaded extension'}],details:{}};}});`);
  const theme=JSON.parse(readFileSync(join(ROOT,'node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/dark.json'),'utf8'));theme.name='fixture-research';
  writeFileSync(join(f.project,'.pi/themes/fixture-research.json'),JSON.stringify(theme));
  const opened=await openResearchSession(f.project,mockConfig);
  try {
    assert.match(opened.session.systemPrompt,/retain the fixture source revision/);
    assert(opened.session.resourceLoader.getSkills().skills.some(skill=>skill.name==='fixture-method'));
    assert(opened.session.resourceLoader.getThemes().themes.some(theme=>theme.name==='fixture-research'));
    await opened.session.prompt('/methods classifiers');
    assert(opened.session.messages.some(message=>message.role==='user' && JSON.stringify(message.content).includes('Draft fixture methods for classifiers')));
    await opened.session.prompt('/skill:fixture-method classifiers');
    assert(opened.session.messages.some(message=>message.role==='user' && JSON.stringify(message.content).includes('Fixture method content')));
    await opened.session.prompt('[tool:fixture_echo]');assert.match(toolContent(opened,'fixture_echo'),/Executed loaded extension/);
    writeFileSync(join(f.project,'.pi/prompts/new-review.md'),'New review template for $1.');
    await opened.session.reload();assert(opened.session.resourceLoader.getPrompts().prompts.some(prompt=>prompt.name==='new-review'));
    assert(opened.session.systemPrompt.includes(readFileSync(resource('manuscript-policy.md'),'utf8').trim()));
  } finally {await opened.dispose();f.cleanup();}
});

test('Configured local MCP connects, discovers a deferred tool and executes it through Pi',async()=>{
  const f=fixture();mkdirSync(join(f.project,'.pi'));
  const server=join(f.directory,'mcp-fixture.mjs');
  writeFileSync(server,`import {createInterface} from 'node:readline';
createInterface({input:process.stdin}).on('line',line=>{const request=JSON.parse(line);if(request.id===undefined)return;
let result={};if(request.method==='initialize')result={protocolVersion:request.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'researchpi-fixture',version:'1'}};
if(request.method==='tools/list')result={tools:[{name:'double',description:'Double a fixture integer',inputSchema:{type:'object',properties:{value:{type:'integer'}},required:['value']}}]};
if(request.method==='tools/call')result={content:[{type:'text',text:String(request.params.arguments.value*2)}]};
process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result})+'\\n');});`);
  writeJson(join(f.project,'.pi/mcp.json'),{mcpServers:{fixture:{command:process.execPath,args:[server],exposure:'deferred'}}});
  const opened=await openResearchSession(f.project,mockConfig);
  try {
    for(let attempt=0;attempt<80 && !opened.session.getAllTools().some(tool=>tool.name==='mcp__fixture__double');attempt++)await delay(50);
    assert(opened.session.getAllTools().some(tool=>tool.name==='mcp__fixture__double'));
    await opened.session.prompt('[tool:tool_search] '+JSON.stringify({query:'double fixture integer'}));assert.match(toolContent(opened,'tool_search'),/mcp__fixture__double/);
    await opened.session.prompt('[tool:mcp__fixture__double] '+JSON.stringify({value:21}));assert.match(toolContent(opened,'mcp__fixture__double'),/42/);
  } finally {await opened.dispose();f.cleanup();}
});

test('Conversation storage imports legacy history without deleting it and supports empty creation, search, rename and forks',async()=>{
  const f=fixture(),legacyDir=join(stateDir(f.project),'sessions');
  const old=SessionManager.create(f.project,legacyDir);old.appendMessage({role:'user',content:'Legacy research question',timestamp:Date.now()});
  const oldPath=old.getSessionFile()!,original=readFileSync(oldPath,'utf8');writeJson(join(stateDir(f.project),'session-pointer.json'),{path:oldPath});
  try {
    const store=new Conversations(f.project);assert.equal(store.current().getSessionId(),old.getSessionId());
    const created=store.create('An empty study');assert.equal((await store.list()).length,2);
    await store.rename(created.getSessionId(),'Named causal study');assert.equal((await store.list(false,'causal')).length,1);
    const fork=await store.fork(old.getSessionId(),undefined,'Alternative analysis');assert.notEqual(fork.getSessionId(),old.getSessionId());
    assert(fork.getBranch().some(entry=>entry.type==='message' && entry.message.role==='user'));
    assert.equal(readFileSync(oldPath,'utf8'),original);
    const second=join(f.directory,'second');mkdirSync(second);new Conversations(second).create('Another project');
    assert.equal((await store.list()).length,3);assert.equal((await store.list(true)).length,4);
    assert.equal((await store.find(created.getSessionId().slice(-8))).id,created.getSessionId());
    await assert.rejects(store.find('missing'),/not found/);
  } finally {f.cleanup();}
});

test('Runtime new, resume, fork and project switches preserve policy and rebind research tools to the selected project',async()=>{
  const f=fixture(),opened=await openResearchSession(f.project,mockConfig);
  try {
    await opened.session.prompt('Original study');const id=opened.session.sessionId,path=opened.session.sessionFile!;
    await opened.runtime.newSession();await opened.session.prompt('Independent study');assert.notEqual(opened.session.sessionId,id);
    await opened.runtime.switchSession(path);assert.equal(opened.session.sessionId,id);
    const user=opened.manager.getEntries().find(entry=>entry.type==='message' && entry.message.role==='user')!;
    await opened.runtime.fork(user.id,{position:'at'});assert.notEqual(opened.session.sessionId,id);
    const policy=readFileSync(resource('manuscript-policy.md'),'utf8').trim();assert(opened.session.systemPrompt.includes(policy));
    const second=join(f.directory,'second');mkdirSync(second);const other=new Conversations(second).create('Other project');
    writeJson(join(stateDir(second),'protocol.json'),{question:'Second project evidence'});
    await opened.runtime.switchSession(other.getSessionFile()!);await opened.session.prompt('[tool:project_status]');
    assert.match(toolContent(opened,'project_status'),/Second project evidence/);
    await opened.session.prompt('[tool:write] '+JSON.stringify({path:'selected-project.txt',content:'Actual project switch'}));
    assert.equal(readFileSync(join(second,'selected-project.txt'),'utf8'),'Actual project switch');
    assert(opened.session.systemPrompt.includes(policy));assert.match(opened.session.systemPrompt,/Web research workflow/);
    assert.equal(JSON.parse(readFileSync(join(stateDir(second),'session-pointer.json'),'utf8')).path,opened.session.sessionFile);
    assert.equal(opened.manager.getSessionDir(),conversationDirectory());
  } finally {await opened.dispose();f.cleanup();}
});

test('CLI conversation commands create, rename, show, filter and reopen a saved chat without an inference account',()=>{
  const f=fixture();
  const run=(args:string[],input='')=>{const result=spawnSync(process.execPath,[join(ROOT,'dist/cli.js'),'--project',f.project,...args],{encoding:'utf8',input,env:process.env,timeout:20000});assert.equal(result.status,0,result.stderr);return result;};
  try {
    const created=JSON.parse(run(['chats','new','CLI study']).stdout);run(['chats','rename',created.id,'Renamed study']);
    const items=JSON.parse(run(['chats','list','--query','Renamed']).stdout);assert.equal(items[0].id,created.id);
    run(['chats','open',created.id,'--offline','--plain'],'A saved question\n/exit\n');
    assert.match(run(['chats','show',created.id]).stdout,/A saved question/);
    const capabilities=JSON.parse(run(['resources']).stdout);assert(capabilities.tools.includes('bash'));assert(capabilities.tools.includes('codemode'));assert.equal(capabilities.autoCompaction,true);
  } finally {f.cleanup();}
});

test('Native terminal interface creates, names and selects conversations using actual keyboard input',{skip:process.platform==='win32'},()=>{
  const result=spawnSync('python3',[join(ROOT,'scripts/test-native-tui.py'),process.execPath],{encoding:'utf8',timeout:60000});
  assert.equal(result.status,0,result.stderr || result.error?.message);assert.match(result.stdout,/Native TUI verified/);
});


function transport(opened:Awaited<ReturnType<typeof openResearchSession>>, responder:NonNullable<Parameters<ModelRuntime['registerProvider']>[1]['streamSimple']>) {
  opened.session.modelRuntime.registerProvider(mockConfig.provider,{api:'researchpi-test',baseUrl:'https://offline.invalid',apiKey:'offline-test',streamSimple:responder});
}
function reply(model:any,context:any,options:{error?:boolean;input?:number}={}) {
  const stream=createAssistantMessageEventStream();
  queueMicrotask(()=>{
    const message:AssistantMessage={role:'assistant',api:model.api,provider:model.provider,model:model.id,content:[{type:'text',text:'Synthetic transport completed'}],stopReason:options.error?'error':'stop',timestamp:Date.now(),
      ...(options.error?{errorMessage:'503 overloaded synthetic test provider'}:{}),usage:{input:options.input??50,output:20,cacheRead:0,cacheWrite:0,totalTokens:(options.input??50)+20,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}};
    stream.push({type:'start',partial:message});stream.push({type:'done',reason:message.stopReason as 'stop'|'error',message});stream.end();
  });return stream;
}

test('Provider failures are retried by the actual Pi session and retain retry events',async()=>{
  const f=fixture(),opened=await openResearchSession(f.project,mockConfig,undefined,{settings:{retry:{enabled:true,maxRetries:2,baseDelayMs:1}}});
  try {
    let calls=0;const events:string[]=[];opened.session.subscribe(event=>events.push(event.type));
    transport(opened,(model,context)=>reply(model,context,{error:++calls===1}));
    await opened.session.prompt('Exercise provider retry');assert.equal(calls,2);assert(events.includes('auto_retry_start'));assert(events.includes('auto_retry_end'));
    assert.equal(opened.session.getLastAssistantText(),'Synthetic transport completed');
  } finally {await opened.dispose();f.cleanup();}
});

test('Streaming sessions accept steering and follow-up messages in their actual queue order',async()=>{
  const f=fixture(),opened=await openResearchSession(f.project,mockConfig);
  try {
    let begin:()=>void;const started=new Promise<void>(resolve=>{begin=resolve;});let calls=0;
    transport(opened,(model,context)=>{
      const stream=createAssistantMessageEventStream();const current=++calls;
      void(async()=>{if(current===1){begin();await delay(100);}const underlying=reply(model,context);for await(const event of underlying)stream.push(event);stream.end();})();return stream;
    });
    const running=opened.session.prompt('Initial request');await started;
    assert.equal(await opened.session.steer('Steering clarification'),'queued');assert.equal(await opened.session.followUp('Follow-up analysis'),'queued');
    await running;
    const users=opened.session.messages.filter(message=>message.role==='user').map(message=>JSON.stringify(message.content));
    assert.deepEqual(users.map(text=>/Initial request/.test(text)?'initial':/Steering clarification/.test(text)?'steer':/Follow-up analysis/.test(text)?'follow-up':'unknown'),['initial','steer','follow-up']);assert.equal(calls,3);
  } finally {await opened.dispose();f.cleanup();}
});

test('Automatic compaction runs through Pi and preserves the host scientific policy',async()=>{
  const f=fixture(),opened=await openResearchSession(f.project,mockConfig,undefined,{settings:{compaction:{enabled:true,reserveTokens:4096,keepRecentTokens:128}}});
  try {
    let calls=0;transport(opened,(model,context)=>reply(model,context,{input:++calls<=2?32000:50}));
    await opened.session.prompt('Synthetic background '+ 'context '.repeat(500));
    await opened.session.prompt('Synthetic continuation '+ 'analysis '.repeat(500));
    await opened.session.prompt('Keep the evidence');
    assert(opened.manager.getEntries().some(entry=>entry.type==='compaction'));
    assert(opened.session.systemPrompt.includes(readFileSync(resource('manuscript-policy.md'),'utf8').trim()));
  } finally {await opened.dispose();f.cleanup();}
});

test('JSON mode streams actual SDK session and tool events without presentation text',()=>{
  const f=fixture();
  try {
    const result=spawnSync(process.execPath,[join(ROOT,'dist/cli.js'),'--project',f.project,'chat','--offline','--json','[tool:project_status]'],{encoding:'utf8',env:process.env,timeout:20000});
    assert.equal(result.status,0,result.stderr);const events=result.stdout.trim().split('\n').map(line=>JSON.parse(line));
    assert(events.some(event=>event.type==='session'));assert(events.some(event=>event.type==='tool_execution_end' && event.toolName==='project_status'));
  } finally {f.cleanup();}
});

test('RPC exposes the real SDK state with enabled context management and exits cleanly on EOF',()=>{
  const f=fixture();
  try {
    const result=spawnSync(process.execPath,[join(ROOT,'dist/cli.js'),'--project',f.project,'rpc','--offline'],{encoding:'utf8',env:process.env,input:'{"id":"fixture","type":"get_state"}\n',timeout:20000});
    assert.equal(result.status,0,result.stderr);const messages=result.stdout.trim().split('\n').map(line=>JSON.parse(line));
    const state=messages.find(message=>message.type==='response' && message.id==='fixture');assert.equal(state.success,true);assert.equal(state.data.autoCompactionEnabled,true);assert.equal(state.data.model.provider,mockConfig.provider);
  } finally {f.cleanup();}
});
