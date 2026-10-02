import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, stateDir } from './paths.js';
import { fileHash, hash, readJson, writeJson } from './storage.js';

export interface Method {
  id: string;
  algorithm: 'sgd_logistic' | 'random_forest';
  hyperparameters: Record<string, number>;
  stochastic: true;
}
export interface Protocol {
  schemaVersion: 1;
  question: string;
  hypothesis: string;
  dataset: { kind: 'synthetic_classification'; nSamples: number; nFeatures: number; nInformative: number; dataSeed: number };
  split: { strategy: 'stratified_holdout'; testFraction: number; splitSeed: number };
  metrics: ['accuracy', 'log_loss'];
  methods: Method[];
  trainingSeeds: number[];
  budget: { maxAttempts: number; secondsPerAttempt: number; device: 'cpu' };
  uncertainty: { method: 'sample_sd'; scope: 'training_randomness_on_fixed_data_and_split'; assumptions: string };
  selection: string;
}
export interface FrozenProtocol { protocol: Protocol; protocolHash: string; codeHash: string; frozenAt: string; }
export function codeFingerprint(): string {
  const sources = readdirSync(join(ROOT, 'src')).filter(x => x.endsWith('.ts')).sort().map(x => 'src/' + x);
  const paths = [...sources, 'python/experiment.py', 'requirements.lock', 'package-lock.json'];
  return hash(paths.map(path => [path, fileHash(join(ROOT, path))]));
}
export function demoProtocol(): Protocol {
  return {
    schemaVersion: 1,
    question: 'How do SGD logistic classification and a small random forest compare on this fixed synthetic split?',
    hypothesis: 'Performance and dispersion differ between these two prespecified configurations.',
    dataset: { kind: 'synthetic_classification', nSamples: 500, nFeatures: 12, nInformative: 8, dataSeed: 1729 },
    split: { strategy: 'stratified_holdout', testFraction: 0.25, splitSeed: 2718 },
    metrics: ['accuracy', 'log_loss'],
    methods: [
      { id: 'sgd-logistic', algorithm: 'sgd_logistic', stochastic: true, hyperparameters: { alpha: 0.001, max_iter: 30 } },
      { id: 'random-forest', algorithm: 'random_forest', stochastic: true, hyperparameters: { n_estimators: 20, max_depth: 6 } },
    ],
    trainingSeeds: [11, 23, 37, 41, 53, 67, 79, 83, 97, 101],
    budget: { maxAttempts: 60, secondsPerAttempt: 30, device: 'cpu' },
    uncertainty: { method: 'sample_sd', scope: 'training_randomness_on_fixed_data_and_split',
      assumptions: 'Sample standard deviation with ddof=1 across ten prespecified training RNG seeds; no population confidence interval or significance claim.' },
    selection: 'Both configurations fixed before execution. No hyperparameter search or test-set selection; demonstration only.',
  };
}
function ensure(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
const integer = (x: unknown, min: number, max: number) => Number.isInteger(x) && Number(x) >= min && Number(x) <= max;
export function validateProtocol(p: Protocol): void {
  ensure(p && p.schemaVersion === 1, 'Unsupported protocol schema');
  for (const key of ['question', 'hypothesis', 'selection'] as const) ensure(typeof p[key] === 'string' && p[key].trim().length > 0, `Missing ${key}`);
  ensure(p.dataset?.kind === 'synthetic_classification', 'MVP runner accepts only synthetic_classification');
  ensure(integer(p.dataset.nSamples, 100, 10000) && integer(p.dataset.nFeatures, 4, 100)
    && integer(p.dataset.nInformative, 2, p.dataset.nFeatures - 2), 'Invalid dataset dimensions');
  ensure(integer(p.dataset.dataSeed, 0, 2**32-1), 'Invalid data seed');
  ensure(p.split?.strategy === 'stratified_holdout' && p.split.testFraction >= 0.1 && p.split.testFraction <= 0.5
    && integer(p.split.splitSeed, 0, 2**32-1), 'Invalid fixed split');
  ensure(Array.isArray(p.metrics) && p.metrics.join(',') === 'accuracy,log_loss', 'Unsupported metrics');
  ensure(Array.isArray(p.trainingSeeds) && p.trainingSeeds.length === 10 && new Set(p.trainingSeeds).size === 10
    && p.trainingSeeds.every(x => integer(x, 0, 2**32-1)), 'Require ten distinct predefined training seeds');
  ensure(Array.isArray(p.methods) && p.methods.length > 0 && p.methods.length <= 10, 'Invalid methods');
  ensure(new Set(p.methods.map(m => m.id)).size === p.methods.length, 'Duplicate configuration id');
  for (const m of p.methods) {
    ensure(/^[a-z][a-z0-9-]{0,63}$/.test(m.id) && m.stochastic === true, 'Invalid configuration id or stochastic policy');
    const h = m.hyperparameters;
    ensure(h && typeof h === 'object', 'Missing hyperparameters');
    if (m.algorithm === 'sgd_logistic') {
      ensure(Object.keys(h).sort().join(',') === 'alpha,max_iter' && Number.isFinite(h.alpha) && h.alpha! > 0 && h.alpha! <= 1
        && integer(h.max_iter, 1, 500), 'Invalid SGD hyperparameters');
    } else {
      ensure(m.algorithm === 'random_forest', 'Algorithm not in runner allowlist');
      ensure(Object.keys(h).sort().join(',') === 'max_depth,n_estimators' && integer(h.max_depth, 1, 30)
        && integer(h.n_estimators, 1, 200), 'Invalid forest hyperparameters');
    }
  }
  ensure(p.budget?.device === 'cpu' && integer(p.budget.maxAttempts, p.methods.length * 10, 300)
    && integer(p.budget.secondsPerAttempt, 1, 300), 'Invalid CPU execution budget');
  ensure(p.uncertainty?.method === 'sample_sd' && p.uncertainty.scope === 'training_randomness_on_fixed_data_and_split'
    && typeof p.uncertainty.assumptions === 'string' && p.uncertainty.assumptions.trim().length > 0, 'Missing uncertainty plan');
}
export function freezeProtocol(project: string, protocol: Protocol, replace = false): FrozenProtocol {
  validateProtocol(protocol);
  const path = join(stateDir(project), 'protocol.json');
  const protocolHash = hash(protocol);
  const codeHash = codeFingerprint();
  if (existsSync(path)) {
    const old = readJson<FrozenProtocol>(path);
    if (old.protocolHash === protocolHash && old.codeHash === codeHash) return old;
    if (!replace) throw new Error('Frozen protocol/code differs. Use freeze --replace explicitly; previous runs will be invalid.');
  }
  const frozen = { protocol, protocolHash, codeHash, frozenAt: new Date().toISOString() };
  writeJson(path, frozen);
  return frozen;
}
export function loadFrozen(project: string): FrozenProtocol {
  const frozen = readJson<FrozenProtocol>(join(stateDir(project), 'protocol.json'));
  validateProtocol(frozen.protocol);
  if (hash(frozen.protocol) !== frozen.protocolHash) throw new Error('Frozen protocol modified: invalid hash');
  if (codeFingerprint() !== frozen.codeHash) throw new Error('Code/environment lock changed since freeze; freeze a new version explicitly.');
  return frozen;
}
