import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resource, stateDir } from './paths.js';
import { aggregateProject, analyzeReceipts, auditProject, readReceipts } from './experiments.js';
import { loadFrozen } from './protocol.js';
import { library } from './science.js';
import { readJson, writeJson } from './storage.js';

export interface Venue {
  id: string; name: string; year: number; track: string; verifiedAt: string; verificationScope: string;
  audience: string; articleTypes: string[]; templateUrl: string;
  rules: { field: string; value: string; sourceUrl: string; sourceSection: string }[];
  deadlines: { abstract: string; paper: string; timezone: string; sourceUrl: string } | null;
  requiresRecheck: string[]; sources: string[];
}
export function venueProfiles(now = new Date()) {
  return readdirSync(resource('venues')).filter(n => n.endsWith('.json')).sort().map(n => {
    const venue = readJson<Venue>(join(resource('venues'), n));
    const age = (now.getTime()-Date.parse(venue.verifiedAt + 'T00:00:00Z'))/86400000;
    return { ...venue, stale: age > 30 || age < 0 || !Number.isFinite(age),
      submissionWindowPassed: venue.deadlines ? now.getTime() > Date.parse(venue.deadlines.paper + 'T23:59:59-12:00') : null,
      submissionReady: false, freshnessNote: 'Partial verified snapshot; official recheck always required before submission.' };
  });
}
export function paperProfiles() { return readJson<Record<string, string[]>>(resource('paper-profiles.json')); }
export function outlinePaper(type = 'empirical', venueId?: string) {
  const sections = paperProfiles()[type];
  if (!sections) throw new Error('Unknown paper type');
  const venue = venueId ? venueProfiles().find(v => v.id === venueId) : null;
  if (venueId && !venue) throw new Error('Unknown venue/year/track profile');
  return { type, sections, venue, editorialReviewPending: true };
}
type Aggregate = ReturnType<typeof aggregateProject>;
export interface Reference { id: string; title: string; url: string; status?: string; }
export interface Claim {
  id: string; text: string; numericValue?: number;
  evidence?: { methodId: string; metric: string; statistic: 'mean' | 'sampleSd' | 'n' };
  referenceIds?: string[];
}
export interface ManuscriptManifest { claims: Claim[]; references: Reference[]; }
export function reviewManifest(manifest: ManuscriptManifest, table?: Aggregate) {
  if (!Array.isArray(manifest.claims) || !Array.isArray(manifest.references)) throw new Error('Manifest requires claims and references arrays');
  const known = library().filter(n => n.referenceStatus === 'verified');
  const references = manifest.references.map(ref => {
    const note = known.find(n => n.id === ref.id && n.sourceUrl === ref.url);
    return { ...ref, status: note ? 'verified_curated_source' : 'pending',
      verifiedAt: note?.verifiedAt ?? null, scope: note?.scope ?? 'Unverified reference; user status is not accepted as verification' };
  });
  const claims = manifest.claims.map(claim => {
    const pending: string[] = [];
    const numericTokens = claim.text.match(/(?<![\p{L}\d])\d+(?:\.\d+)?/gu) ?? [];
    const numeric = claim.numericValue !== undefined || numericTokens.length > 0;
    let evidenceValue: number | undefined;
    if (numeric) {
      const row = table?.rows.find(r => r.methodId === claim.evidence?.methodId);
      const metric = claim.evidence ? row?.metrics[claim.evidence.metric] : undefined;
      evidenceValue = claim.evidence && metric ? metric[claim.evidence.statistic] : undefined;
      if (!Number.isFinite(claim.numericValue) || evidenceValue === undefined
        || Math.abs(claim.numericValue! - evidenceValue) > 1e-10) pending.push('Numeric claim missing matching measured evidence');
      if (numericTokens.some(token => Math.abs(Number(token)-claim.numericValue!) > 1e-10)) pending.push('Additional prose numbers require separate evidence');
    }
    const ids = claim.referenceIds ?? [];
    if (ids.some(id => !references.some(r => r.id === id && r.status === 'verified_curated_source'))) pending.push('Reference missing or unverified');
    if (!numeric && ids.length === 0) pending.push('No evidence or verified reference attached');
    return { ...claim, status: pending.length ? 'pending' : 'mechanically_linked', pending,
      evidenceValue: evidenceValue ?? null, scientificReviewPending: true };
  });
  return { references, claims, status: references.some(r => r.status === 'pending') || claims.some(c => c.status === 'pending') ? 'pending' : 'mechanically_linked',
    scientificReviewPending: true, scope: 'Structured manifest only; no proof that cited sources support prose semantics or that an arbitrary manuscript is valid.' };
}
const md = (s: string) => s.replace(/[\n\r|]/g, ' ');
export function draftPaper(project: string, options: { type?: string; venueId?: string; manifest?: ManuscriptManifest } = {}) {
  const frozen = loadFrozen(project), p = frozen.protocol;
  const outline = outlinePaper(options.type ?? 'empirical', options.venueId ?? 'tmlr-2026-journal');
  const audit = auditProject(project);
  const table = audit.status === 'complete' ? aggregateProject(project) : undefined;
  const selected = table ? analyzeReceipts(frozen, readReceipts(project)).selected : [];
  const notes = library().filter(n => ['sklearn-practices','mensh-kording','neurips-checklist'].includes(n.id));
  const generated: Claim[] = table ? table.rows.flatMap(row => Object.entries(row.metrics).map(([metric, values]) => ({
    id: row.methodId + '-' + metric + '-mean', text: `${row.methodId}: ${metric} mean ${values.mean}`,
    numericValue: values.mean, evidence: { methodId: row.methodId, metric, statistic: 'mean' as const },
  }))) : [];
  const manifest = { claims: [...generated, ...(options.manifest?.claims ?? [])],
    references: [...notes.map(n => ({ id: n.id, title: n.title, url: n.sourceUrl })), ...(options.manifest?.references ?? [])] };
  const review = reviewManifest(manifest, table);
  const missing = [
    'Novel scientific contribution, external validity and baseline adequacy require expert review.',
    'Introduction, related work, abstract and discussion require evidence-based editorial completion.',
    'Official venue rules, anonymity and current submission conditions must be checked again.',
    ...(table ? [] : ['Results pending: ten valid seeds per configuration not yet available.']),
    ...review.claims.filter(c => c.status === 'pending').map(c => `Claim ${c.id}: ${c.pending.join('; ')}`),
    ...review.references.filter(r => r.status === 'pending').map(r => `Reference ${r.id}: verification pending`),
  ];
  const complete = table !== undefined;
  const first = selected[0]?.measurement;
  const methods = p.methods.map(m => `${m.algorithm === 'sgd_logistic' ? 'Logistic classification fitted with stochastic gradient descent (SGD)' : 'Random forest classification, combining decision trees'} (${m.id}), parameters ${JSON.stringify(m.hyperparameters)}`).join('; ');
  const methodology = complete
    ? `${selected.length} central processing unit (CPU) training runs were completed: ${methods}. The synthetic dataset contains ${p.dataset.nSamples} samples and ${p.dataset.nFeatures} features (${p.dataset.nInformative} informative; two redundant), with data seed ${p.dataset.dataSeed}. The fixed stratified split uses testFraction=${p.split.testFraction} and splitSeed=${p.split.splitSeed}: ${first!.trainSamples} training samples and ${first!.testSamples} evaluation samples. Feature standardization using training-set means and standard deviations (StandardScaler) was fitted exclusively on training data inside the SGD pipeline; the forest uses no scaling. SGD uses log_loss, tol=None and shuffle=True; the forest uses bootstrap and n_jobs=1.\n\n`
      + `Each configuration was trained with predefined seeds ${p.trainingSeeds.join(', ')}. No hyperparameters or best seed were selected on test data. ${md(p.selection)} Binary accuracy and log_loss were measured; log_loss probabilities were clipped to [1e-15, 1-1e-15]. Means and sample standard deviations (ddof=1) are recalculated from predictions. ${md(p.uncertainty.assumptions)}\n\n`
      + `Measured environment: ${JSON.stringify(first!.environment)}. Budget: up to ${p.budget.maxAttempts} attempts and ${p.budget.secondsPerAttempt} seconds per attempt. Each receipt retains measured durations and warnings. Historical incomplete attempts/retries: ${audit.groups.reduce((sum,g) => sum+g.historicalFailures,0)}.\n\n`
      + `Provenance: [protocol](protocol.json), [table](aggregate.json), [CSV](results.csv), [recalculated audit](audit.json) and [journal](journal.jsonl). Protocol hash: ${frozen.protocolHash}. Code hash: ${frozen.codeHash}. Table hash: ${table!.tableHash}.`
    : `PLAN PENDING VALIDATED EXECUTION: ${methods}. Planned seeds: ${p.trainingSeeds.join(', ')}. Protocol ${frozen.protocolHash}. No numbers are presented as measured results.`;
  const results = table ? 'Table 1 summarizes the configurations defined in the methods section; their identifiers are emphasized in bold. Accuracy is the proportion of correct predictions; log loss measures the negative log probability assigned to the true class, with lower values preferred. Each mean summarizes n training runs, and SD denotes their sample standard deviation.\n\n'
    + '| Configuration | n | Mean accuracy | SD | Mean log loss | SD |\n|---|---:|---:|---:|---:|---:|\n'
    + table.rows.map(row => `| **${row.methodId}** | ${row.metrics.accuracy!.n} | ${row.metrics.accuracy!.mean.toFixed(6)} | ${row.metrics.accuracy!.sampleSd.toFixed(6)} | ${row.metrics.log_loss!.mean.toFixed(6)} | ${row.metrics.log_loss!.sampleSd.toFixed(6)} |`).join('\n')
    + '\n\nTable 1. Classification metrics across the predefined training seeds.\n\nEach row links through receiptIds in aggregate.json to its ten original runs. This describes training variability on a single split; it makes no claim of statistical significance or population generalization.'
    : 'PENDING: insufficient coverage/evidence. No supported results table is available.';
  const sections = outline.sections.map(section => {
    if (section === 'Title') return '# Reproducible classification demo with ResearchPi\n\nDemonstration draft; scientific and editorial review pending.';
    if (section === 'Methodology' || section === 'Materials and Methods') return '## ' + section + '\n\n' + methodology;
    if (section === 'Results') return '## Results\n\n' + results;
    if (section === 'Limitations') return '## Limitations\n\nSynthetic data and a single split. Budgets were not optimized as a benchmark, and the demo establishes no general superiority, novel contribution or causal effect. Ten seeds implement a user policy. Scientific review is required.';
    if (section === 'References') return '## References\n\n' + review.references.map(ref => `- [${md(ref.title)}](${ref.url}); ${ref.status}, reviewed ${ref.verifiedAt ?? 'pending'}`).join('\n');
    if (section === 'Abstract' || section === 'Conclusion' || section === 'Conclusions') return '## ' + section + '\n\nPENDING: state the evidence-supported contribution consistently with the abstract, introduction and conclusion. This execution alone does not establish novelty.';
    if (section === 'Introduction') return '## Introduction\n\nPENDING: explain the research difficulty, related-work gap and evidence-supported contribution.\n\n'
      + 'The article presents related work, the study design and methods, the results, and their interpretation, followed by limitations, conclusions and reproducibility details. Adapt this roadmap after completing the contribution statement and final section structure.';
    if (section === 'Reproducibility appendix') return '## Reproducibility appendix\n\nRun `repi demo` in a new project with pinned versions.\n\n' + selected.map(r => `- ${r.methodId}, seed ${r.seed}: [receipt](runs/${r.id}.json), [predictions](artifacts/${r.id}.json)`).join('\n');
    return '## ' + section + '\n\nPENDING: write and review against evidence. This demo does not establish a scientific contribution.';
  });
  const report = { mechanicalEvidence: audit, manuscript: review, outline, missing, submissionReady: false };
  writeJson(join(stateDir(project), 'paper-review.json'), report);
  writeJson(join(stateDir(project), 'paper-manifest.json'), manifest);
  const path = join(stateDir(project), 'paper.md');
  writeFileSync(path, sections.join('\n\n') + '\n\n## Publication profile\n\n' + outline.venue?.id + ': ' + outline.venue?.freshnessNote + '\n');
  return { path, reportPath: join(stateDir(project), 'paper-review.json'), report };
}
export function reviewProjectManifest(project: string, manifest: ManuscriptManifest) {
  const frozenPath = join(stateDir(project), 'protocol.json');
  const table = existsSync(frozenPath) && auditProject(project).status === 'complete' ? aggregateProject(project) : undefined;
  return reviewManifest(manifest, table);
}
