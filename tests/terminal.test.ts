import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripVTControlCharacters } from 'node:util';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ResponseView } from '../src/presentation.js';
import { ROOT } from '../src/paths.js';

// Both channels are separately captured, as a shell pipeline would capture them.
test('Streaming presentation separates reasoning and tools, preserves text and strips split terminal controls', () => {
  for (const isTTY of [false, true]) {
    let answer = '', activity = '';
    const out = { isTTY, write: (s: string) => { answer += s; } };
    const err = { isTTY, write: (s: string) => { activity += s; } };
    const view = new ResponseView(true, true, out, err);
    view.thinking('Compare the two'); view.thinking(' baselines.');
    view.text('# Result\nMeasured '); view.text('accuracy');
    view.text('\x1b]52;c;'); view.text('injected clipboard\x1b'); view.text('\\');
    view.text('\x1b['); view.text('2J'); view.text(': 0.8');
    view.toolStart('call', 'project_status'); view.toolEnd('call', 'project_status', false);
    view.text('**Evidence '); view.text('checked.**\n``'); view.text('`python\n# **keep code**\n```\n'); view.finish();
    assert.equal(stripVTControlCharacters(answer), `${isTTY && !('NO_COLOR' in process.env) && process.env.TERM !== 'dumb' ? 'Result' : '# Result'}\nMeasured accuracy: 0.8\n${isTTY && !('NO_COLOR' in process.env) && process.env.TERM !== 'dumb' ? 'Evidence checked.' : '**Evidence checked.**'}\n` + '```python\n# **keep code**\n```\n');
    assert.match(activity, /Reasoning.*provider stream/);
    assert.match(activity, /Compare the two.*baselines/);
    assert.match(activity, /Tool: project_status/); assert.match(activity, /project_status.*done/);
    assert.doesNotMatch(stripVTControlCharacters(answer), /clipboard|baselines/);
    if (!isTTY) assert.doesNotMatch(activity, /\x1b/);
  }
  let activity = '';
  const hidden = new ResponseView(false, false, { write: () => {} }, { write: (s: string) => { activity += s; } });
  hidden.thinking('Provider reasoning'); hidden.finish(); assert.equal(activity, '');
});

test('CLI streams provider reasoning and answer before completion; display settings persist across resume', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'repi-streaming-'));
  const preload = join(directory, 'provider.mjs');
  writeFileSync(preload, `globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(init.body);
    if (!body.messages.some(m => m.role === 'system' && m.content.includes('For a greeting, give a brief greeting')))
      throw new Error('Research system instructions missing');
    const encoder = new TextEncoder();
    const packet = delta => encoder.encode('data: ' + JSON.stringify({id:'test', object:'chat.completion.chunk', choices:[{index:0, delta, finish_reason:null}]}) + '\\n\\n');
    return new Response(new ReadableStream({start(controller) {
      controller.enqueue(packet({role:'assistant', reasoning_content:'Compare baselines.'}));
      controller.enqueue(packet({content:'First token'}));
      setTimeout(() => {
        controller.enqueue(packet({content:' final token'}));
        controller.enqueue(encoder.encode('data: ' + JSON.stringify({id:'test', object:'chat.completion.chunk', choices:[{index:0, delta:{}, finish_reason:'stop'}]}) + '\\n\\n'));
        controller.close();
      }, 750);
    }}), {headers:{'Content-Type':'text/event-stream'}});
  };`);
  const env = { ...process.env, RESEARCH_PI_DATA_DIR: join(directory, 'data'), OPENCODE_API_KEY: 'synthetic-test-key' };
  const args = ['--import', preload, join(ROOT, 'dist/cli.js'), '--project', directory];
  const run = (extra: string[], input = '') => spawnSync(process.execPath, [...args, ...extra], { env, input, encoding: 'utf8', timeout: 20000 });
  try {
    assert.equal(run(['config', '--provider', 'opencode-go', '--model', 'glm-5.3-flash']).status, 0);
    let answer = '', activity = '', sawPartial = false;
    const child = spawn(process.execPath, [...args, 'chat', 'hello'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    const result = await new Promise<number | null>((resolve, reject) => {
      const timer = setTimeout(() => { child.kill(); reject(new Error('Streaming CLI timed out')); }, 20000);
      child.stdout.on('data', chunk => { answer += chunk; if (answer.includes('First token') && !answer.includes('final token')) sawPartial = true; });
      child.stderr.on('data', chunk => { activity += chunk; });
      child.on('error', reject); child.on('close', code => { clearTimeout(timer); resolve(code); });
    });
    assert.equal(result, 0, activity); assert(sawPartial, 'Answer was buffered until completion');
    assert.equal(answer, 'First token final token\n'); assert.match(activity, /Compare baselines/);
    const commands = run([], '/reasoning off\n/thinking low\nhello\n/exit\n');
    assert.equal(commands.status, 0, commands.stderr);
    assert.match(commands.stderr, /ResearchPi.*v[0-9]+\.[0-9]+\.[0-9]+/); assert.match(commands.stderr, /Reasoning effort: low/);
    assert.doesNotMatch(commands.stderr, /Compare baselines/);
    assert.deepEqual(JSON.parse(readFileSync(join(directory, '.research-pi/ui.json'), 'utf8')), { thinkingLevel: 'low', showReasoning: false });
    const resumed = run([], '/thinking\n/reasoning\n/exit\n');
    assert.equal(resumed.status, 0, resumed.stderr); assert.match(resumed.stderr, /Reasoning effort: low/); assert.match(resumed.stderr, /stream: off/);
    const invalid = run([], '/thinking bogus\n/reasoning maybe\n/exit\n');
    assert.match(invalid.stderr, /Available reasoning levels/); assert.match(invalid.stderr, /Use \/reasoning on/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
