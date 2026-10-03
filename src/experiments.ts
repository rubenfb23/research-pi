import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, stateDir, pythonVenvDirectory } from './paths.js';
import { codeFingerprint, loadFrozen, type FrozenProtocol, type Method } from './protocol.js';
import { fileHash, hash, readJson, writeJson } from './storage.js';

export interface Predictions { testIndices: number[]; labels: number[]; predicted: number[]; probabilities: number[]; }
export interface Measurement {
  seed: number; method: Method; dataHash: string; environment: Record<string, string | number>;
  durationSeconds: number; trainSamples: number; testSamples: number;
  metrics: { accuracy: number; log_loss: number }; predictions: Predictions; warnings: string[];
}
export interface Receipt {
  id: string; protocolHash: string; codeHash: string; configHash: string; methodId: string;
  seed: number; attempt: number; status: 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted';
  startedAt: string; finishedAt?: string; error?: string;
  measurement?: Measurement; artifactHash?: string;
}
interface JournalEvent { index: number; previous: string | null; receipt: Receipt; digest: string; }
export const receiptDir = (project: string) => join(stateDir(project), 'runs');
export function readReceipts(project: string): Receipt[] {
  const dir = receiptDir(project);
  return existsSync(dir) ? readdirSync(dir).filter(n => n.endsWith('.json')).map(n => readJson<Receipt>(join(dir, n))) : [];
}
function journalPath(project: string) { return join(stateDir(project), 'journal.jsonl'); }
function readJournal(project: string): JournalEvent[] {
  const file = journalPath(project);
  return existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
}
function record(project: string, receipt: Receipt): void {
  const journal = readJournal(project);
  const body = { index: journal.length, previous: journal.at(-1)?.digest ?? null, receipt };
  const entry = { ...body, digest: hash(body) };
  mkdirSync(receiptDir(project), { recursive: true, mode: 0o700 });
  // Journal first: a crash between journal and receipt is detectable by audit.
  appendFileSync(journalPath(project), JSON.stringify(entry) + '\n', { mode: 0o600 });
  writeJson(join(receiptDir(project), receipt.id + '.json'), receipt);
}
function lock(project: string): () => void {
  mkdirSync(stateDir(project), { recursive: true, mode: 0o700 });
  const path = join(stateDir(project), 'runner.lock');
  const owner = { pid: process.pid, token: randomUUID() };
  if (existsSync(path)) {
    const existing = readJson<{ pid: number }>(path);
    try { process.kill(existing.pid, 0); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
      rmSync(path);
    }
  }
  try { writeFileSync(path, JSON.stringify(owner), { flag: 'wx', mode: 0o600 }); }
  catch { throw new Error('Another runner/freeze holds the project lock.'); }
  return () => { if (existsSync(path) && readJson<{ token: string }>(path).token === owner.token) rmSync(path); };
}
export function withProjectLock<T>(project: string, fn: () => T): T {
  const release = lock(project);
  try { return fn(); } finally { release(); }
}
export function recalculateMetrics(p: Predictions) {
  const n = p.labels?.length;
  if (!n || p.predicted.length !== n || p.probabilities.length !== n || p.testIndices.length !== n
    || new Set(p.testIndices).size !== n || !p.testIndices.every(i => Number.isInteger(i) && i >= 0)) throw new Error('Invalid prediction arrays');
  let correct = 0, loss = 0;
  for (let i = 0; i < n; i++) {
    const label = p.labels[i]!, predicted = p.predicted[i]!, prob = p.probabilities[i]!;
    if (![0,1].includes(label) || ![0,1].includes(predicted) || !Number.isFinite(prob) || prob < 1e-15 || prob > 1-1e-15) throw new Error('Invalid binary prediction');
    correct += Number(label === predicted);
    loss -= label * Math.log(prob) + (1-label) * Math.log(1-prob);
  }
  return { accuracy: correct/n, log_loss: loss/n };
}
function validateMeasurement(m: Measurement, frozen: FrozenProtocol, method: Method, seed: number): void {
  if (m.seed !== seed || hash(m.method) !== hash(method) || !/^[a-f0-9]{64}$/.test(m.dataHash)) throw new Error('Worker configuration mismatch');
  const recalculated = recalculateMetrics(m.predictions);
  for (const metric of frozen.protocol.metrics) {
    if (!Number.isFinite(m.metrics[metric]) || Math.abs(recalculated[metric]-m.metrics[metric]) > 1e-10) throw new Error('Measured metric does not match predictions');
  }
  const expectedTest = Math.ceil(frozen.protocol.dataset.nSamples*frozen.protocol.split.testFraction);
  if (m.testSamples !== expectedTest || m.predictions.labels.length !== expectedTest
    || m.trainSamples + m.testSamples !== frozen.protocol.dataset.nSamples || m.predictions.testIndices.some(i=>i>=frozen.protocol.dataset.nSamples)) throw new Error('Dataset size mismatch');
  if (m.environment.device !== 'cpu' || m.environment.threads !== 1 || !Number.isFinite(m.durationSeconds) || m.durationSeconds < 0) throw new Error('Invalid runtime environment');
  const pinned = readFileSync(join(ROOT, 'requirements.lock'), 'utf8');
  for (const [pkg, key] of [['numpy', 'numpy'], ['scikit-learn', 'scikitLearn'], ['scipy', 'scipy']] as const) {
    if (!pinned.split('\n').includes(pkg + '==' + m.environment[key])) throw new Error(`Unpinned runtime ${pkg}`);
  }
}

export function pythonPath(): string {
  return process.env.RESEARCH_PI_PYTHON ?? join(pythonVenvDirectory(), process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
}
function worker(frozen: FrozenProtocol, method: Method, seed: number, signal?: AbortSignal): Promise<Measurement> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('Cancelled')); return; }
    const child = spawn(pythonPath(), [join(ROOT, 'python', 'experiment.py')], {
      stdio: ['pipe', 'pipe', 'pipe'],
      // Scientific subprocess receives no API credentials or other inherited secrets.
      env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT,
        OMP_NUM_THREADS: '1', OPENBLAS_NUM_THREADS: '1', MKL_NUM_THREADS: '1', PYTHONHASHSEED: '0' },
    });
    let output = '', errors = '', cancelled = false, timedOut = false;
    const cancel = () => { cancelled = true; child.kill('SIGTERM'); };
    signal?.addEventListener('abort', cancel, { once: true });
    const timeout = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, frozen.protocol.budget.secondsPerAttempt*1000);
    child.stdout.on('data', chunk => { output += chunk; if (output.length > 8_000_000) child.kill('SIGKILL'); });
    child.stderr.on('data', chunk => { errors = (errors + chunk).slice(-4000); });
    child.stdin.on('error', () => {});
    child.on('error', error => { clearTimeout(timeout); signal?.removeEventListener('abort', cancel); reject(error); });
    child.on('close', code => {
      clearTimeout(timeout); signal?.removeEventListener('abort', cancel);
      if (cancelled || signal?.aborted) { reject(new Error('Cancelled')); return; }
      if (timedOut) { reject(new Error('Attempt exceeded frozen time budget')); return; }
      if (code !== 0) { reject(new Error(`Worker exit ${code}: ${errors}`)); return; }
      try { resolve(JSON.parse(output)); } catch { reject(new Error('Invalid worker output')); }
    });
    child.stdin.end(JSON.stringify({ protocol: frozen.protocol, method, seed }));
  });
}

export async function runExperiment(project: string, options: { signal?: AbortSignal; retryFailed?: boolean; onProgress?: (receipt: Receipt) => void } = {}) {
  const release = lock(project);
  try {
    const frozen = loadFrozen(project);
    const old = readReceipts(project);
    for (const running of old.filter(r => r.status === 'running')) record(project, { ...running, status: 'interrupted', finishedAt: new Date().toISOString(), error: 'Previous process ended before a terminal receipt' });
    // Validate storage before trusting a prior success during resume.
    const integrity = storageErrors(project);
    if (integrity.length) throw new Error(integrity.join('; '));
    for (const method of frozen.protocol.methods) for (const seed of frozen.protocol.trainingSeeds) {
      if (options.signal?.aborted) return auditProject(project);
      const previous = readReceipts(project).filter(r => r.protocolHash === frozen.protocolHash && r.codeHash === frozen.codeHash && r.configHash === hash(method) && r.seed === seed).sort((a,b) => a.attempt-b.attempt);
      const latest = previous.at(-1);
      if (latest?.status === 'completed') { validateMeasurement(latest.measurement!, frozen, method, seed); continue; }
      if (latest && !options.retryFailed) throw new Error('Unfinished/failed attempt exists; run --retry explicitly.');
      const attempts = readReceipts(project).filter(r => r.protocolHash === frozen.protocolHash && r.codeHash === frozen.codeHash).length;
      if (attempts >= frozen.protocol.budget.maxAttempts) throw new Error('Frozen total attempt budget exhausted');
      const receipt: Receipt = { id: randomUUID(), protocolHash: frozen.protocolHash, codeHash: frozen.codeHash,
        configHash: hash(method), methodId: method.id, seed, attempt: (latest?.attempt ?? 0)+1,
        status: 'running', startedAt: new Date().toISOString() };
      record(project, receipt);
      try {
        const measurement = await worker(frozen, method, seed, options.signal);
        if (codeFingerprint() !== frozen.codeHash) throw new Error('Code changed during execution');
        const current = loadFrozen(project);
        if (current.protocolHash !== frozen.protocolHash) throw new Error('Protocol changed during execution');
        validateMeasurement(measurement, frozen, method, seed);
        const artifact = join(stateDir(project), 'artifacts', receipt.id + '.json');
        writeJson(artifact, measurement.predictions);
        receipt.measurement = measurement; receipt.artifactHash = fileHash(artifact); receipt.status = 'completed';
      } catch (error) {
        receipt.status = options.signal?.aborted ? 'cancelled' : 'failed';
        receipt.error = (error as Error).message;
      }
      receipt.finishedAt = new Date().toISOString();
      record(project, receipt); options.onProgress?.(receipt);
      if (receipt.status !== 'completed') return auditProject(project);
    }
    return auditProject(project);
  } finally { release(); }
}

export function storageErrors(project: string): string[] {
  const errors: string[] = [];
  try {
    const entries = readJournal(project);
    const last = new Map<string, Receipt>();
    let previous: string | null = null;
    entries.forEach((e, index) => {
      if (e.index !== index || e.previous !== previous || hash({ index: e.index, previous: e.previous, receipt: e.receipt }) !== e.digest) errors.push('Journal chain mismatch');
      previous = e.digest; last.set(e.receipt.id, e.receipt);
    });
    const receipts = readReceipts(project);
    if (receipts.length !== last.size) errors.push('Receipt/journal count mismatch');
    for (const r of receipts) {
      if (!/^[a-f0-9-]{36}$/.test(r.id) || hash(r) !== hash(last.get(r.id))) errors.push('Receipt differs from runner journal');
      if (r.status === 'completed') {
        const file = join(stateDir(project), 'artifacts', r.id + '.json');
        if (!existsSync(file) || fileHash(file) !== r.artifactHash || hash(readJson(file)) !== hash(r.measurement?.predictions)) errors.push('Artifact missing or changed');
      }
    }
  } catch (e) { errors.push('Malformed evidence storage: ' + (e as Error).message); }
  return errors;
}
export function analyzeReceipts(frozen: FrozenProtocol, receipts: Receipt[]) {
  const errors: string[] = [];
  const groups: { methodId: string; completedSeeds: number[]; missingSeeds: number[]; historicalFailures: number }[] = [];
  const selected: Receipt[] = [];
  const dataHashes = new Set<string>(), environments = new Set<string>(), testSets = new Set<string>();
  for (const r of receipts) {
    if (r.protocolHash !== frozen.protocolHash || r.codeHash !== frozen.codeHash) errors.push('Incompatible protocol or code version');
    const method = frozen.protocol.methods.find(m => m.id === r.methodId);
    if (!method || hash(method) !== r.configHash || !frozen.protocol.trainingSeeds.includes(r.seed)) errors.push('Incompatible configuration or unplanned seed');
  }
  for (const method of frozen.protocol.methods) {
    const completedSeeds: number[] = [], missingSeeds: number[] = [];
    const local = receipts.filter(r => r.methodId === method.id);
    const failures = local.filter(r => r.status !== 'completed').length;
    for (const seed of frozen.protocol.trainingSeeds) {
      const attempts = local.filter(r => r.seed === seed).sort((a,b) => a.attempt-b.attempt);
      if (new Set(attempts.map(r => r.attempt)).size !== attempts.length || attempts.filter(r => r.status === 'completed').length > 1) errors.push(`Duplicate seed/attempt: ${method.id}/${seed}`);
      const latest = attempts.at(-1);
      if (latest?.status !== 'completed') { missingSeeds.push(seed); continue; }
      try {
        validateMeasurement(latest.measurement!, frozen, method, seed);
        dataHashes.add(latest.measurement!.dataHash); environments.add(hash(latest.measurement!.environment));
        testSets.add(hash({ indices: latest.measurement!.predictions.testIndices, labels: latest.measurement!.predictions.labels }));
        completedSeeds.push(seed); selected.push(latest);
      } catch (e) { errors.push((e as Error).message); missingSeeds.push(seed); }
    }
    groups.push({ methodId: method.id, completedSeeds, missingSeeds, historicalFailures: failures });
  }
  if (dataHashes.size > 1 || testSets.size > 1) errors.push('Data/split fingerprints differ');
  if (environments.size > 1) errors.push('Incompatible measured runtime environments');
  return { status: errors.length === 0 && groups.every(g => g.missingSeeds.length === 0) ? 'complete' : 'incomplete',
    protocolHash: frozen.protocolHash, codeHash: frozen.codeHash, errors: [...new Set(errors)], groups,
    selected, scope: 'Mechanical coverage and traceability only; scientific review remains pending.' };
}
export function auditProject(project: string) {
  const frozen = loadFrozen(project);
  const analysis = analyzeReceipts(frozen, readReceipts(project));
  const { selected: _, ...report } = analysis;
  const errors = [...report.errors, ...storageErrors(project)];
  return { ...report, errors, status: errors.length ? 'incomplete' : report.status };
}
export function aggregateProject(project: string) {
  const audit = auditProject(project);
  if (audit.status !== 'complete') throw new Error('Cannot aggregate incomplete/invalid evidence: ' + JSON.stringify(audit));
  const frozen = loadFrozen(project);
  const { selected } = analyzeReceipts(frozen, readReceipts(project));
  const rows = frozen.protocol.methods.map(method => {
    const runs = selected.filter(r => r.methodId === method.id);
    const metrics = Object.fromEntries(frozen.protocol.metrics.map(metric => {
      const values = runs.map(r => recalculateMetrics(r.measurement!.predictions)[metric]);
      const mean = values.reduce((a,b) => a+b,0)/values.length;
      const sd = Math.sqrt(values.reduce((a,b) => a+(b-mean)**2,0)/(values.length-1));
      return [metric, { n: values.length, mean, sampleSd: sd }];
    }));
    return { methodId: method.id, configHash: hash(method), metrics, receiptIds: runs.map(r => r.id) };
  });
  const table = { protocolHash: frozen.protocolHash, codeHash: frozen.codeHash, uncertainty: frozen.protocol.uncertainty, rows };
  const evidenceHash = hash(selected.map(r => [r.id, hash(r)]).sort(([a],[b]) => String(a).localeCompare(String(b))));
  const result = { ...table, evidenceHash, tableHash: hash(table) };
  writeJson(join(stateDir(project), 'aggregate.json'), result);
  writeJson(join(stateDir(project), 'audit.json'), audit);
  const csv = ['method,n,accuracy_mean,accuracy_sample_sd,log_loss_mean,log_loss_sample_sd', ...rows.map(row => {
    const a = row.metrics.accuracy!, l = row.metrics.log_loss!;
    return [row.methodId, a.n, a.mean, a.sampleSd, l.mean, l.sampleSd].join(',');
  })].join('\n') + '\n';
  writeFileSync(join(stateDir(project), 'results.csv'), csv);
  return result;
}
