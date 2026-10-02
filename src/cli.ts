#!/usr/bin/env node
import { Command } from 'commander';
import { join, resolve } from 'node:path';
import { openResearchSession } from './agent.js';
import { stateDir } from './paths.js';
import { projectStatus, writeJson } from './storage.js';
import { readJson } from './storage.js';
import { demoProtocol, freezeProtocol } from './protocol.js';
import { aggregateProject, auditProject, runExperiment, withProjectLock } from './experiments.js';
import type { Protocol } from './protocol.js';
import { searchLibrary, scientificProtocol, reviewCausal, type CausalPlan } from './science.js';
import { researchTools } from './tools.js';
import { draftPaper, outlinePaper, reviewProjectManifest, venueProfiles, type ManuscriptManifest } from './papers.js';

const program = new Command().name('research-pi').version('0.1.0')
  .description('Scientific harness on the Pi SDK').option('--project <directory>', 'project directory', '.');
const project = () => resolve(program.opts().project);
program.command('config').requiredOption('--provider <id>').requiredOption('--model <id>').action(opts => {
  writeJson(join(stateDir(project()), 'config.json'), { provider: opts.provider, model: opts.model });
  console.log('Model configuration saved; credentials stay in environment variables.');
});
program.command('status').action(() => console.log(JSON.stringify(projectStatus(project()), null, 2)));
program.command('search').argument('[query]', 'Spanish/English lexical query', '').option('--topic <topic>').action((query, opts) => {
  console.log(JSON.stringify(searchLibrary(query, opts.topic), null, 2));
});
program.command('protocol').argument('<id>', 'experimental, causal or methodology').action(id => {
  console.log(JSON.stringify(scientificProtocol(id), null, 2));
});
program.command('causal').requiredOption('--file <json>', 'causal plan JSON').action(opts => {
  const review = reviewCausal(readJson<CausalPlan>(resolve(opts.file)));
  console.log(JSON.stringify(review, null, 2));
  if (review.status !== 'ready_for_scientific_review') process.exitCode = 1;
});
program.command('venues').action(() => console.log(JSON.stringify(venueProfiles(), null, 2)));
program.command('outline').option('--type <type>', 'empirical, theory, dataset, systems, survey', 'empirical')
  .option('--venue <id>').action(opts => console.log(JSON.stringify(outlinePaper(opts.type, opts.venue), null, 2)));
program.command('paper').option('--type <type>', 'paper type', 'empirical').option('--venue <id>', 'venue/year/track', 'tmlr-2026-journal')
  .option('--manifest <file>', 'additional structured claims and references').action(opts => {
    const result = withProjectLock(project(), () => draftPaper(project(), { type: opts.type, venueId: opts.venue,
      manifest: opts.manifest ? readJson<ManuscriptManifest>(resolve(opts.manifest)) : undefined }));
    console.log(JSON.stringify({ paper: result.path, review: result.reportPath, missing: result.report.missing }, null, 2));
  });
program.command('review-manifest').requiredOption('--file <json>').action(opts => {
  const result = withProjectLock(project(), () => reviewProjectManifest(project(), readJson<ManuscriptManifest>(resolve(opts.file))));
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'pending') process.exitCode = 1;
});
program.command('freeze').option('--file <json>', 'protocol file; otherwise use the prespecified demo')
  .option('--replace', 'explicitly freeze a new version; old evidence becomes incompatible').action(opts => {
    const frozen = withProjectLock(project(), () => freezeProtocol(project(), opts.file ? readJson<Protocol>(resolve(opts.file)) : demoProtocol(), opts.replace));
    console.log(JSON.stringify(frozen, null, 2));
  });
async function run(retryFailed = false) {
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  try {
    const audit = await runExperiment(project(), { signal: controller.signal, retryFailed,
      onProgress: r => console.error(`${r.methodId} seed=${r.seed} attempt=${r.attempt}: ${r.status}`) });
    console.log(JSON.stringify(audit, null, 2));
    if (controller.signal.aborted) process.exitCode = 130;
    else if (audit.status !== 'complete') process.exitCode = 1;
    return audit;
  } finally { process.removeListener('SIGINT', stop); }
}
program.command('run').option('--retry', 'retry failed/cancelled attempts explicitly').action(async opts => { await run(opts.retry); });
program.command('audit').action(() => {
  const audit = auditProject(project()); console.log(JSON.stringify(audit, null, 2));
  if (audit.status !== 'complete') process.exitCode = 1;
});
program.command('aggregate').action(() => console.log(JSON.stringify(aggregateProject(project()), null, 2)));
program.command('demo').description('Freeze, execute twenty CPU fits and aggregate actual results').action(async () => {
  withProjectLock(project(), () => freezeProtocol(project(), demoProtocol()));
  const audit = await run();
  if (audit.status === 'complete') {
    const draft = withProjectLock(project(), () => draftPaper(project()));
    console.log(JSON.stringify({ table: aggregateProject(project()), paper: draft.path, review: draft.reportPath }, null, 2));
  }
});
program.command('chat').argument('<prompt>').option('--compact', 'compact conversation after the reply').action(async (prompt, opts) => {
  const opened = await openResearchSession(project(), undefined, researchTools(project()));
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
