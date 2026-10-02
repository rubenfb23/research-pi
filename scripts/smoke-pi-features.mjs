import assert from 'node:assert/strict';
import { mkdtempSync,rmSync,readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
const app=process.argv[2],directory=mkdtempSync(join(tmpdir(),'repi-installed-pi-'));
process.env.RESEARCH_PI_DATA_DIR=join(directory,'data');
const {openResearchSession,mockConfig}=await import(pathToFileURL(join(app,'dist/agent.js')).href);
const {Conversations}=await import(pathToFileURL(join(app,'dist/conversations.js')).href);
const opened=await openResearchSession(directory,mockConfig);
try {
  for(const name of ['read','write','edit','bash','grep','find','ls','codemode','tool_search','project_status'])assert(opened.session.getActiveToolNames().includes(name),name);
  assert.equal(opened.session.autoCompactionEnabled,true);assert.equal(opened.session.autoRetryEnabled,true);
  await opened.session.prompt('[tool:write] '+JSON.stringify({path:'installed-evidence.txt',content:'Actual installed file tool evidence'}));
  assert.equal(readFileSync(join(directory,'installed-evidence.txt'),'utf8'),'Actual installed file tool evidence');
  await opened.session.prompt('[tool:read] '+JSON.stringify({path:'installed-evidence.txt'}));
  await opened.session.prompt('[tool:codemode] '+JSON.stringify({code:'text(await tools.read({path:"installed-evidence.txt"}));'}));
  const result=opened.session.messages.filter(message=>message.role==='toolResult' && message.toolName==='codemode').at(-1);assert(result && !result.isError,JSON.stringify(result));
  const path=opened.session.sessionFile,id=opened.session.sessionId;
  await opened.runtime.newSession();await opened.session.prompt('A second installed conversation');assert.notEqual(opened.session.sessionId,id);
  await opened.runtime.switchSession(path);assert.equal(opened.session.sessionId,id);
  const store=new Conversations(directory);assert.equal((await store.list()).length,2);
  assert.match(opened.session.systemPrompt,/Web research workflow/);assert.match(opened.session.systemPrompt,/novelty|contribution/);
  console.log('Installed Pi capabilities verified: actual file read/write, codemode execution, automatic settings, persistent new/resume and scientific policy.');
} finally {await opened.dispose();rmSync(directory,{recursive:true,force:true});}
