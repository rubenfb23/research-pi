import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { demoProtocol, freezeProtocol, loadFrozen, validateProtocol } from '../src/protocol.js';
import { aggregateProject, analyzeReceipts, auditProject, readReceipts, runExperiment, receiptDir, withProjectLock } from '../src/experiments.js';
import { canonical, hash, writeJson } from '../src/storage.js';
import { stateDir } from '../src/paths.js';
import { draftPaper, reviewManifest } from '../src/papers.js';
import { openResearchSession } from '../src/agent.js';

const project = mkdtempSync(join(tmpdir(), 'researchpi-runs-'));
let receipts: ReturnType<typeof readReceipts>;
let frozen: ReturnType<typeof freezeProtocol>;
before(async () => {
  frozen = freezeProtocol(project, demoProtocol());
  const cancel = new AbortController();
  const timer = setTimeout(() => cancel.abort(), 30);
  try { await runExperiment(project, { signal: cancel.signal }); } finally { clearTimeout(timer); }
  assert.equal(readReceipts(project)[0]?.status, 'cancelled');
  assert.equal(auditProject(project).status, 'incomplete');
  await assert.rejects(runExperiment(project), /--retry/);
  const audit = await runExperiment(project, { retryFailed: true });
  assert.equal(audit.status, 'complete');
  assert.equal(audit.groups[0]?.historicalFailures, 1);
  receipts = readReceipts(project).filter(r => r.status === 'completed');
  assert.equal(receipts.length, 20);
});
after(() => rmSync(project, { recursive: true, force: true }));

test('H2: twenty genuine fits, per-seed predictions and independently recalculated metrics', () => {
  assert.equal(analyzeReceipts(frozen, receipts).status, 'complete');
  const first = aggregateProject(project), second = aggregateProject(project);
  assert.equal(first.tableHash, second.tableHash);
  assert.equal(canonical(first), canonical(second));
  assert(first.rows.every(row => row.metrics.accuracy?.n === 10));
  assert(first.rows.some(row => row.metrics.accuracy!.sampleSd > 0));
});
test('H4: paper uses real table, exposes claim-to-receipt links and missing scientific review', () => {
  const table = aggregateProject(project);
  const draft = draftPaper(project);
  const text = readFileSync(draft.path, 'utf8');
  assert.match(text, /Se ejecutaron 20 entrenamientos/);
  assert(text.includes(table.rows[0]!.metrics.accuracy!.mean.toFixed(6)));
  assert(text.includes(receipts[0]!.id));
  assert(draft.report.manuscript.claims.every(c => c.status === 'mechanically_linked'));
  assert.equal(draft.report.submissionReady, false);
  const value = table.rows[0]!.metrics.accuracy!.mean;
  const review = reviewManifest({ references: [], claims: [{ id: 'measured', text: 'Measured mean', numericValue: value,
    evidence: { methodId: table.rows[0]!.methodId, metric: 'accuracy', statistic: 'mean' } }] }, table);
  assert.equal(review.claims[0]?.status, 'mechanically_linked');
  review.claims[0]!.numericValue = 1;
  assert.equal(reviewManifest({ references: [], claims: review.claims }, table).status, 'pending');
});
test('Actual experiment evidence survives Pi resume and real SDK compaction', async () => {
  const before = hash(readReceipts(project));
  let first;
  let second;
  try {
    first = await openResearchSession(project);
    await first.session.prompt('[tool:project_status]');
    await first.session.prompt('Research background: ' + 'scientific context '.repeat(500));
    await first.session.prompt('Persist state.');
    first.savePointer();
    await first.session.compact();
    first.session.dispose();
    second = await openResearchSession(project);
    assert(second.manager.getEntries().some(e => e.type === 'compaction'));
    await second.session.prompt('[tool:project_status]');
    assert.equal(hash(readReceipts(project)), before);
    assert.equal(auditProject(project).status, 'complete');
  } finally { first?.session.dispose(); second?.session.dispose(); }
});
test('Real worker startup failure leaves a failed receipt and refuses aggregation', async () => {
  const failedProject = mkdtempSync(join(tmpdir(), 'researchpi-failure-'));
  const old = process.env.RESEARCH_PI_PYTHON;
  try {
    freezeProtocol(failedProject, demoProtocol());
    process.env.RESEARCH_PI_PYTHON = join(failedProject, 'missing-python');
    const audit = await runExperiment(failedProject);
    assert.equal(audit.status, 'incomplete');
    assert.equal(readReceipts(failedProject)[0]?.status, 'failed');
    assert.throws(() => aggregateProject(failedProject), /invalid evidence/);
  } finally {
    if (old === undefined) delete process.env.RESEARCH_PI_PYTHON; else process.env.RESEARCH_PI_PYTHON = old;
    rmSync(failedProject, { recursive: true, force: true });
  }
});
test('H2: nine seeds, duplicate and failed run never complete', () => {
  assert.equal(analyzeReceipts(frozen, receipts.slice(1)).status, 'incomplete');
  assert.equal(analyzeReceipts(frozen, [...receipts, { ...receipts[0]!, id: 'duplicate' }]).status, 'incomplete');
  const bad = structuredClone(receipts); bad[0]!.status = 'failed';
  assert.equal(analyzeReceipts(frozen, bad).status, 'incomplete');
});
test('H2: config/version/data/metrics incompatibility invalidates evidence', () => {
  const badConfig = structuredClone(receipts); badConfig[0]!.configHash = 'incompatible';
  assert.equal(analyzeReceipts(frozen, badConfig).status, 'incomplete');
  const newProtocol = structuredClone(frozen); newProtocol.protocol.split.splitSeed++;
  newProtocol.protocolHash = hash(newProtocol.protocol);
  assert.equal(analyzeReceipts(newProtocol, receipts).status, 'incomplete');
  const badData = structuredClone(receipts); badData[0]!.measurement!.dataHash = 'a'.repeat(64);
  assert.equal(analyzeReceipts(frozen, badData).status, 'incomplete');
  const badCode = structuredClone(receipts); badCode[0]!.codeHash = 'other-code-version';
  assert.equal(analyzeReceipts(frozen, badCode).status, 'incomplete');
  const badEnvironment = structuredClone(receipts); badEnvironment[0]!.measurement!.environment.platform = 'other-platform';
  assert.equal(analyzeReceipts(frozen, badEnvironment).status, 'incomplete');
  const fakeMetric = structuredClone(receipts); fakeMetric[0]!.measurement!.metrics.accuracy = -1;
  assert.equal(analyzeReceipts(frozen, fakeMetric).status, 'incomplete');
});
test('H2: edited receipt/artifact detected, aggregation refuses it', () => {
  const file = join(receiptDir(project), receipts[0]!.id + '.json');
  const original = readFileSync(file);
  try {
    writeJson(file, { ...receipts[0], error: 'manual modification' });
    assert.equal(auditProject(project).status, 'incomplete');
    assert.throws(() => aggregateProject(project), /invalid evidence/);
  } finally { writeFileSync(file, original); }
  const artifact = join(stateDir(project), 'artifacts', receipts[0]!.id + '.json');
  const old = readFileSync(artifact);
  try { writeFileSync(artifact, '{}'); assert.equal(auditProject(project).status, 'incomplete'); }
  finally { writeFileSync(artifact, old); }
});
test('H2: changed frozen protocol invalidates existing audit, locks prevent concurrency', () => {
  const path = join(stateDir(project), 'protocol.json');
  const old = readFileSync(path);
  try {
    const changed = structuredClone(frozen); changed.protocol.question = 'Changed after seeing data';
    writeJson(path, changed);
    assert.throws(() => auditProject(project), /invalid hash/);
  } finally { writeFileSync(path, old); }
  withProjectLock(project, () => assert.throws(() => withProjectLock(project, () => {}), /lock/));
});
test('H2: protocol policy rejects insufficient/duplicate planned seeds', () => {
  const nine = demoProtocol(); nine.trainingSeeds.pop();
  assert.throws(() => validateProtocol(nine), /ten distinct/);
  const duplicate = demoProtocol(); duplicate.trainingSeeds[9] = duplicate.trainingSeeds[0]!;
  assert.throws(() => validateProtocol(duplicate), /ten distinct/);
  assert.equal(loadFrozen(project).protocolHash, frozen.protocolHash);
});
