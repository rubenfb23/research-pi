import {spawnSync} from 'node:child_process';
import { existsSync, readdirSync, readFileSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';
import { ROOT, stateDir } from './paths.js';
import { fileHash, hash, readJson, writeJson } from './storage.js';

export interface Method {
  id: string;
  algorithm: 'sgd_logistic' | 'random_forest' | 'custom_python';
  implementation?: { path: string; sha256: string; description: string };
  hyperparameters: Record<string, number>;
  stochastic: true;
}
export type Dataset =
  | { kind: 'synthetic_classification'; nSamples: number; nFeatures: number; nInformative: number; dataSeed: number }
  | { kind: 'breast_cancer'; nSamples: 569; nFeatures: 30; sourceUrl: string; license: string }
  | { kind: 'csv_binary'; nSamples: number; nFeatures: number; path: string; sha256: string; target: string; features: string[]; sourceUrl: string; license: string };
export interface Protocol {
  schemaVersion: 1;
  question: string;
  hypothesis: string;
  dataset: Dataset;
  split: { strategy: 'stratified_holdout'; testFraction: number; splitSeed: number };
  metrics: ['accuracy', 'log_loss'];
  methods: Method[];
  trainingSeeds: number[];
  budget: { maxAttempts: number; secondsPerAttempt: number; device: 'cpu' };
  uncertainty: { method: 'sample_sd'; scope: 'training_randomness_on_fixed_data_and_split'; assumptions: string };
  selection: string;
}
export interface FrozenProtocol { protocol: Protocol; protocolHash: string; codeHash: string; frozenAt: string; source?:{revision:string|null;dirty:boolean|null}; }
export function codeFingerprint(): string {
  const sources = readdirSync(join(ROOT, 'src')).filter(x => x.endsWith('.ts')).sort().map(x => 'src/' + x);
  const compiled = existsSync(join(ROOT, 'dist')) ? readdirSync(join(ROOT, 'dist')).filter(x => x.endsWith('.js')).sort().map(x => 'dist/' + x) : [];
  const paths = [...sources, ...compiled, 'python/experiment.py', 'requirements.lock', 'package-lock.json'];
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
  const d = p.dataset;
  ensure(d && integer(d.nSamples, 100, 10000) && integer(d.nFeatures, 1, 100), 'Invalid dataset dimensions');
  if (d.kind === 'synthetic_classification') {
    ensure(d.nFeatures >= 4 && integer(d.nInformative, 2, d.nFeatures - 2), 'Invalid informative dimensions');
    ensure(integer(d.dataSeed, 0, 2**32-1), 'Invalid data seed');
  } else if (d.kind === 'breast_cancer') {
    ensure(d.nSamples === 569 && d.nFeatures === 30, 'Built-in dataset dimensions must match');
    ensure(d.sourceUrl === 'https://archive.ics.uci.edu/dataset/17/breast+cancer+wisconsin+diagnostic' && d.license === 'CC BY 4.0', 'Built-in dataset provenance must match');
  } else {
    ensure(d.kind === 'csv_binary', 'Unsupported dataset');
    ensure(isAbsolute(d.path) && /^[a-f0-9]{64}$/.test(d.sha256), 'CSV requires an absolute snapshot path and SHA-256');
    ensure(Array.isArray(d.features) && d.features.length === d.nFeatures && new Set(d.features).size === d.features.length
      && d.features.every(f => typeof f === 'string' && f.trim()) && typeof d.target === 'string' && d.target.trim() && !d.features.includes(d.target), 'Invalid feature/target selection');
    ensure(typeof d.sourceUrl === 'string' && /^https?:\/\//.test(d.sourceUrl) && typeof d.license === 'string' && d.license.trim(), 'CSV requires source URL and license/permission provenance');
  }
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
    } else if (m.algorithm === 'custom_python') {
      ensure(m.implementation && isAbsolute(m.implementation.path) && /^[a-f0-9]{64}$/.test(m.implementation.sha256) && m.implementation.description?.trim(), 'Custom method requires source snapshot, SHA-256 and description');
      ensure(Object.values(h).every(v => Number.isFinite(v)), 'Invalid custom hyperparameters');
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
  verifyInputs(protocol);
  const codeHash = codeFingerprint();
  if (existsSync(path)) {
    const old = readJson<FrozenProtocol>(path);
    if (old.protocolHash === protocolHash && old.codeHash === codeHash) return old;
    if (!replace) throw new Error('Frozen protocol/code differs. Use freeze --replace explicitly; previous runs will be invalid.');
  }
  const revision=spawnSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8',timeout:3000});
  const changes=revision.status===0 ? spawnSync('git',['status','--porcelain'],{cwd:ROOT,encoding:'utf8',timeout:3000}) : null;
  const installed=existsSync(join(ROOT,'package-runtime.json')) ? readJson<{sourceRevision?:string}>(join(ROOT,'package-runtime.json')) : null;
  const frozen = { protocol, protocolHash, codeHash, frozenAt: new Date().toISOString(),source:{revision:revision.status===0 ? revision.stdout.trim() : installed?.sourceRevision??null,dirty:changes?.status===0 ? Boolean(changes.stdout.trim()) : null} };
  writeJson(path, frozen);
  return frozen;
}
export function loadFrozen(project: string): FrozenProtocol {
  const frozen = readJson<FrozenProtocol>(join(stateDir(project), 'protocol.json'));
  validateProtocol(frozen.protocol);
  verifyInputs(frozen.protocol);
  if (hash(frozen.protocol) !== frozen.protocolHash) throw new Error('Frozen protocol modified: invalid hash');
  if (codeFingerprint() !== frozen.codeHash) throw new Error('Code/environment lock changed since freeze; freeze a new version explicitly.');
  return frozen;
}


export function realDataProtocol(): Protocol {
  const p = demoProtocol();
  p.question = 'How do two prespecified classifiers compare on the Wisconsin Diagnostic Breast Cancer dataset?';
  p.dataset = { kind:'breast_cancer', nSamples:569, nFeatures:30,
    sourceUrl:'https://archive.ics.uci.edu/dataset/17/breast+cancer+wisconsin+diagnostic', license:'CC BY 4.0' };
  p.selection = 'Two configurations fixed before execution. A single stratified split; no test-set tuning. Educational reproducibility study, not clinical validation.';
  return p;
}
function snapshot(project: string, path: string, extension: string) {
  const input = resolve(project,path);
  if (!statSync(input).isFile() || statSync(input).size > 4*1024*1024) throw new Error('Input must be a regular file smaller than 4 MiB');
  const sha256 = fileHash(input), directory=join(stateDir(project),'inputs');
  mkdirSync(directory,{recursive:true,mode:0o700});
  const dest=join(directory,sha256+extension);
  if (!existsSync(dest)) copyFileSync(input,dest);
  if (fileHash(dest)!==sha256) throw new Error('Input snapshot changed');
  return {path:dest,sha256};
}
export function verifyInputs(p: Protocol) {
  if (p.dataset.kind==='csv_binary' && fileHash(p.dataset.path)!==p.dataset.sha256) throw new Error('Frozen dataset snapshot changed');
  for (const m of p.methods) if (m.algorithm==='custom_python' && (!m.implementation || fileHash(m.implementation.path)!==m.implementation.sha256)) throw new Error('Frozen method snapshot changed');
}
export function attachCustomMethod(project: string, p: Protocol, source: string, description: string): Protocol {
  const next=structuredClone(p);
  next.methods.push({id:'custom-method',algorithm:'custom_python',stochastic:true,hyperparameters:{},
    implementation:{...snapshot(project,source,'.py'),description}});
  next.budget.maxAttempts=Math.max(next.budget.maxAttempts,next.methods.length*20);
  validateProtocol(next); return next;
}
// CSV parser supports quoted commas/newlines and escaped quotes. Python independently validates it.
export function csvRows(text: string): string[][] {
  const rows:string[][]=[]; let row:string[]=[],field='',quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i]!;
    if(c==='"') { if(quoted && text[i+1]==='"') {field+='"';i++;} else quoted=!quoted; }
    else if(c===',' && !quoted) {row.push(field);field='';}
    else if(c==='\n' && !quoted) {row.push(field.replace(/\r$/,''));if(row.some(x=>x.length)) rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(quoted) throw new Error('Unterminated CSV quote');
  if(field.length || row.length) {row.push(field.replace(/\r$/,''));rows.push(row);}
  return rows;
}
export function csvProtocol(project: string, options:{path:string;target:string;features:string[];sourceUrl:string;license:string}): Protocol {
  const input=snapshot(project,options.path,'.csv');
  const rows=csvRows(readFileSync(input.path,'utf8').replace(/^\ufeff/,'')),header=rows.shift();
  if(!header || new Set(header).size!==header.length || !options.features.length || options.features.includes(options.target)) throw new Error('CSV needs unique headers and separate feature/target columns');
  const indices=[...options.features,options.target].map(name=>header.indexOf(name));
  if(indices.some(i=>i<0)) throw new Error('Requested CSV column is missing');
  if(rows.some(row=>row.length!==header.length || indices.some(i=>!row[i]?.trim() || !Number.isFinite(Number(row[i]))))) throw new Error('CSV features/labels must be finite numeric values with no missing cells');
  const labels=rows.map(row=>Number(row[indices.at(-1)!]));
  if(labels.some(label=>label!==0 && label!==1) || [0,1].some(label=>labels.filter(x=>x===label).length<10)) throw new Error('CSV requires binary 0/1 labels and at least ten samples per class');
  const p=demoProtocol();
  p.question='How do the prespecified configurations compare on this versioned CSV dataset?';
  p.dataset={kind:'csv_binary',nSamples:rows.length,nFeatures:options.features.length,...input,target:options.target,features:options.features,sourceUrl:options.sourceUrl,license:options.license};
  p.selection='Configurations and feature columns fixed before execution; no test-set tuning. Source and permission recorded by the researcher; review leakage and sampling assumptions.';
  validateProtocol(p); return p;
}
