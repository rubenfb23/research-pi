import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openResearchSession } from '../src/agent.js';
import { stateDir } from '../src/paths.js';
import { projectStatus, writeJson, canonical } from '../src/storage.js';
import { researchTools } from '../src/tools.js';

test('H1: real Pi SDK mock tool call, persistent resume and actual compaction preserve scientific state', async () => {
  const project = mkdtempSync(join(tmpdir(), 'researchpi-session-'));
  const protocol = { version: 'test-frozen', seeds: [1,2,3,4,5,6,7,8,9,10] };
  writeJson(join(stateDir(project), 'protocol.json'), protocol);
  const before = canonical(projectStatus(project));
  let first;
  let second;
  try {
    first = await openResearchSession(project);
    assert.match(first.session.systemPrompt, /ten distinct/);
    assert.deepEqual(first.session.getActiveToolNames(), ['project_status']);
    await first.session.prompt('[tool:project_status]');
    first.savePointer();
    assert(first.session.messages.some(m => m.role === 'toolResult' && m.toolName === 'project_status'));
    const file = first.manager.getSessionFile();
    await first.session.prompt('Context for compaction: ' + 'scientific reasoning background '.repeat(400));
    await first.session.prompt('Keep this conversation resumable.');
    await first.session.compact();
    assert(first.manager.getEntries().some(e => e.type === 'compaction'));
    first.session.dispose();
    second = await openResearchSession(project);
    assert.equal(second.manager.getSessionFile(), file);
    assert(second.manager.getEntries().some(e => e.type === 'compaction'));
    await second.session.prompt('[tool:project_status]');
    assert.equal(canonical(projectStatus(project)), before);
  } finally { first?.session.dispose(); second?.session.dispose(); rmSync(project, { recursive: true, force: true }); }
});

test('H3: research tools operate through Pi with no free filesystem/shell tool', async () => {
  const project = mkdtempSync(join(tmpdir(), 'researchpi-tools-'));
  const opened = await openResearchSession(project, undefined, researchTools(project));
  try {
    const names = opened.session.getActiveToolNames();
    assert(names.includes('search_library') && names.includes('run_frozen_experiment'));
    assert(!names.some(n => ['read','write','edit','bash','codemode'].includes(n)));
    await opened.session.prompt('[tool:search_library] {"query":"causal identificación"}');
    const message = opened.session.messages.find(m => m.role === 'toolResult' && m.toolName === 'search_library');
    assert(message && message.role === 'toolResult' && !message.isError);
    assert.match(JSON.stringify(message.content), /dowhy-causal/);
  } finally { opened.session.dispose(); rmSync(project, { recursive: true, force: true }); }
});
