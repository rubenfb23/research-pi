#!/usr/bin/env node
import { Command } from 'commander';
import { join, resolve } from 'node:path';
import { chat } from './chat.js';
import { connect, connectionName, changeModel, connectionRuntime, selectedConfig, connections } from './connections.js';
import { terminalUI } from './terminal.js';
import { ensureExperiments } from './setup.js';
import { ROOT, stateDir } from './paths.js';
import { projectStatus, writeJson } from './storage.js';
import { readJson } from './storage.js';
import { demoProtocol, freezeProtocol } from './protocol.js';
import { aggregateProject, auditProject, runExperiment, withProjectLock } from './experiments.js';
import type { Protocol } from './protocol.js';
import { searchLibrary, scientificProtocol, reviewCausal, type CausalPlan } from './science.js';
import { draftPaper, outlinePaper, reviewProjectManifest, venueProfiles, type ManuscriptManifest } from './papers.js';

const program = new Command().name('repi').version(readJson<{ version: string }>(join(ROOT, 'package.json')).version)
  .description('ResearchPi: investigación con Claude u OpenAI sobre el SDK de Pi')
  .option('--project <directory>', 'directorio del proyecto', '.')
  .option('--offline', 'chat de prueba sin conexión ni razonamiento científico');
const project = () => resolve(program.opts().project);
program.command('config').requiredOption('--provider <id>').requiredOption('--model <id>').action(opts => {
  writeJson(join(stateDir(project()), 'config.json'), { provider: opts.provider, model: opts.model });
  console.log('Modelo guardado. Usa connect para configurar credenciales.');
});
program.command('connect').alias('login').argument('[connection]', 'claude, codex, openai u offline')
  .option('--model <id>', 'modelo del catálogo de Pi').action(async (name, opts) => {
    const controller = new AbortController();
    const ui = terminalUI(controller.signal);
    const stop = () => { controller.abort(); ui.close(); };
    process.once('SIGINT', stop);
    try { await connect(project(), name ? connectionName(name) : undefined, ui, opts.model); }
    finally { ui.close(); process.removeListener('SIGINT', stop); }
  });
program.command('model').argument('<id>').action(async id => { await changeModel(project(), id); console.log('Modelo guardado.'); });
program.command('models').argument('[connection]', 'claude, codex u openai').action(async name => {
  const provider = name ? connections[connectionName(name)].provider : selectedConfig(project())?.provider;
  if (!provider || provider === 'researchpi-mock') { console.log('Selecciona claude, codex u openai.'); return; }
  console.log(JSON.stringify((await connectionRuntime()).getModels(provider).map(m => ({ id: m.id, name: m.name })), null, 2));
});
program.command('connection').action(async () => {
  const config = selectedConfig(project());
  const configured = config?.provider === 'researchpi-mock' ? 'offline-test'
    : config ? Boolean(await (await connectionRuntime()).checkAuth(config.provider)) : false;
  console.log(JSON.stringify({ selected: config ?? null, credentialsConfigured: configured, liveResponseVerified: 'Solo una respuesta real verifica acceso al modelo.' }, null, 2));
});
program.command('disconnect').argument('<connection>', 'claude, codex u openai').action(async name => {
  const provider = connections[connectionName(name)].provider;
  if (provider !== 'researchpi-mock') await (await connectionRuntime()).logout(provider);
  console.log('Credencial local eliminada. Las variables de entorno y la autorización del proveedor se gestionan por separado.');
});
program.command('setup').option('--experiments', 'preparar también Python para los experimentos').action(async opts => {
  if (opts.experiments) await ensureExperiments();
  console.log('ResearchPi está preparado. Ejecuta repi (tras instalar la CLI) o ./research-pi para abrir el chat.');
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
    await ensureExperiments(controller.signal);
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
program.command('chat').argument('[prompt]').option('--offline', 'transporte de prueba sin conexión')
  .option('--compact', 'compactar después de la respuesta').action(async (prompt, opts) => {
    await chat(project(), prompt, { ...opts, offline: opts.offline || program.opts().offline });
  });
program.action(async () => { await chat(project(), undefined, { offline: program.opts().offline }); });
await program.parseAsync().catch(error => { console.error(error.message); process.exitCode = 1; });
