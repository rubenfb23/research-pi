#!/usr/bin/env node
import { Command } from 'commander';
import { join, resolve } from 'node:path';
import { openResearchSession } from './agent.js';
import { stateDir } from './paths.js';
import { projectStatus, writeJson } from './storage.js';

const program = new Command().name('research-pi').version('0.1.0')
  .description('Scientific harness on the Pi SDK').option('--project <directory>', 'project directory', '.');
const project = () => resolve(program.opts().project);
program.command('config').requiredOption('--provider <id>').requiredOption('--model <id>').action(opts => {
  writeJson(join(stateDir(project()), 'config.json'), { provider: opts.provider, model: opts.model });
  console.log('Model configuration saved; credentials stay in environment variables.');
});
program.command('status').action(() => console.log(JSON.stringify(projectStatus(project()), null, 2)));
program.command('chat').argument('<prompt>').option('--compact', 'compact conversation after the reply').action(async (prompt, opts) => {
  const opened = await openResearchSession(project());
  const stop = () => { void opened.session.abort(); };
  process.once('SIGINT', stop);
  try {
    await opened.session.prompt(prompt);
    opened.savePointer();
    const last = opened.session.messages.at(-1);
    if (last?.role === 'assistant' && (last.stopReason === 'error' || last.stopReason === 'aborted')) {
      throw new Error(last.errorMessage ?? last.stopReason);
    }
    console.log(opened.session.getLastAssistantText());
    if (opts.compact) { await opened.session.compact(); opened.savePointer(); console.log('Conversation compacted. Scientific state preserved separately.'); }
  } finally { process.removeListener('SIGINT', stop); opened.session.dispose(); }
});
await program.parseAsync().catch(error => { console.error(error.message); process.exitCode = 1; });
