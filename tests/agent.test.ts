import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openResearchSession, mockConfig } from '../src/agent.js';
import { resource, stateDir } from '../src/paths.js';
import { projectStatus, writeJson, canonical } from '../src/storage.js';
import { researchTools } from '../src/tools.js';
import { demoProtocol, loadFrozen } from '../src/protocol.js';

const originalTestData = process.env.RESEARCH_PI_DATA_DIR;
const isolatedTestData = mkdtempSync(join(tmpdir(),'repi-sdk-test-data-'));
process.env.RESEARCH_PI_DATA_DIR=isolatedTestData;
after(()=>{if(originalTestData===undefined)delete process.env.RESEARCH_PI_DATA_DIR;else process.env.RESEARCH_PI_DATA_DIR=originalTestData;rmSync(isolatedTestData,{recursive:true,force:true});});

test('H1: real Pi SDK mock tool call, persistent resume and actual compaction preserve scientific state', async () => {
  const project = mkdtempSync(join(tmpdir(), 'researchpi-session-'));
  const protocol = { version: 'test-frozen', seeds: [1,2,3,4,5,6,7,8,9,10] };
  writeJson(join(stateDir(project), 'protocol.json'), protocol);
  const before = canonical(projectStatus(project));
  let first;
  let second;
  const policy = readFileSync(resource('manuscript-policy.md'), 'utf8').trim();
  try {
    first = await openResearchSession(project, mockConfig, undefined, {settings:{compaction:{keepRecentTokens:128}}});
    assert.match(first.session.systemPrompt, /ten distinct/);
    assert(first.session.systemPrompt.includes(policy));
    assert(first.session.getActiveToolNames().includes('project_status'));
    assert(first.session.getActiveToolNames().includes('bash'));
    assert.equal(first.session.autoCompactionEnabled,true);
    assert.equal(first.session.autoRetryEnabled,true);
    await first.session.prompt('[tool:project_status]');
    first.savePointer();
    assert(first.session.messages.some(m => m.role === 'toolResult' && m.toolName === 'project_status'));
    const file = first.manager.getSessionFile();
    await first.session.prompt('Context for compaction: ' + 'scientific reasoning background '.repeat(400));
    await first.session.prompt('Keep this conversation resumable.');
    await first.session.compact();
    assert(first.session.systemPrompt.includes(policy));
    assert(first.manager.getEntries().some(e => e.type === 'compaction'));
    first.session.dispose();
    second = await openResearchSession(project, mockConfig, undefined, {settings:{compaction:{keepRecentTokens:128}}});
    assert(second.session.systemPrompt.includes(policy));
    assert.equal(second.manager.getSessionFile(), file);
    assert(second.manager.getEntries().some(e => e.type === 'compaction'));
    await second.session.prompt('[tool:project_status]');
    assert.equal(canonical(projectStatus(project)), before);
  } finally { first?.session.dispose(); second?.session.dispose(); rmSync(project, { recursive: true, force: true }); }
});

test('H3: research tools and native Pi execution coexist while the frozen runner enforces ten seeds', async () => {
  const project = mkdtempSync(join(tmpdir(), 'researchpi-tools-'));
  const opened = await openResearchSession(project, mockConfig, researchTools(project));
  try {
    const names = opened.session.getActiveToolNames();
    assert(names.includes('search_library') && names.includes('run_frozen_experiment'));
    assert(['read','write','edit','bash','grep','find','ls','codemode','tool_search'].every(n => names.includes(n)));
    await opened.session.prompt('[tool:search_library] {"query":"causal identificación"}');
    const message = opened.session.messages.find(m => m.role === 'toolResult' && m.toolName === 'search_library');
    assert(message && message.role === 'toolResult' && !message.isError);
    assert.match(JSON.stringify(message.content), /dowhy-causal/);
    const proposed = demoProtocol(); proposed.question = 'A user-defined supported experiment';
    await opened.session.prompt('[tool:freeze_experiment_protocol] ' + JSON.stringify({ protocolJson: JSON.stringify(proposed) }));
    assert.equal(loadFrozen(project).protocol.question, proposed.question);
    const reduced = demoProtocol(); reduced.trainingSeeds.pop();
    await opened.session.prompt('[tool:freeze_experiment_protocol] ' + JSON.stringify({ protocolJson: JSON.stringify(reduced) }));
    const rejection = opened.session.messages.filter(m => m.role === 'toolResult' && m.toolName === 'freeze_experiment_protocol').at(-1);
    assert(rejection && rejection.role === 'toolResult' && rejection.isError);
    assert.equal(loadFrozen(project).protocol.question, proposed.question);
  } finally { opened.session.dispose(); rmSync(project, { recursive: true, force: true }); }
});
