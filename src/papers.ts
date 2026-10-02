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
  const methods = p.methods.map(m => `${m.id} (${m.algorithm}), parámetros ${JSON.stringify(m.hyperparameters)}`).join('; ');
  let methodology = complete
    ? `Se ejecutaron ${selected.length} entrenamientos en CPU: ${methods}. Se generaron ${p.dataset.nSamples} muestras sintéticas con ${p.dataset.nFeatures} features (${p.dataset.nInformative} informativas; dos redundantes), seed de datos ${p.dataset.dataSeed}. La partición estratificada fija usa testFraction=${p.split.testFraction} y splitSeed=${p.split.splitSeed}: ${first!.trainSamples} muestras de entrenamiento y ${first!.testSamples} de evaluación. StandardScaler se ajustó exclusivamente en train dentro del pipeline SGD; el forest no usa escalado. SGD usa pérdida log_loss, tol=None y shuffle=True; el forest usa bootstrap y n_jobs=1.\n\n`
      + `Cada configuración se entrenó con las seeds predefinidas ${p.trainingSeeds.join(', ')}. No hubo selección de hiperparámetros ni del mejor seed sobre test. ${md(p.selection)} Se midieron accuracy y log_loss binarios; las probabilidades para log_loss se limitaron a [1e-15, 1-1e-15]. Media y SD muestral (ddof=1) se recalculan desde predicciones. ${md(p.uncertainty.assumptions)}\n\n`
      + `Entorno medido: ${JSON.stringify(first!.environment)}. Presupuesto: hasta ${p.budget.maxAttempts} intentos y ${p.budget.secondsPerAttempt} segundos por intento. Las duraciones medidas y warnings se conservan en cada recibo. Intentos no terminados/reintentos históricos: ${audit.groups.reduce((s,g) => s+g.historicalFailures,0)}.\n\n`
      + `Procedencia: [protocolo](protocol.json), [tabla](aggregate.json), [CSV](results.csv), [auditoría recalculada](audit.json) y [journal](journal.jsonl). Protocol hash: ${frozen.protocolHash}. Code hash: ${frozen.codeHash}. Table hash: ${table!.tableHash}.`
    : `PLAN PENDIENTE DE EJECUCIÓN VALIDADA: ${methods}. Seeds previstas: ${p.trainingSeeds.join(', ')}. Protocolo ${frozen.protocolHash}. No se presentan cifras como resultados medidos.`;
  const results = table ? '| Configuración | n | Accuracy media | SD | Log loss media | SD |\n|---|---:|---:|---:|---:|---:|\n'
    + table.rows.map(row => `| ${row.methodId} | ${row.metrics.accuracy!.n} | ${row.metrics.accuracy!.mean.toFixed(6)} | ${row.metrics.accuracy!.sampleSd.toFixed(6)} | ${row.metrics.log_loss!.mean.toFixed(6)} | ${row.metrics.log_loss!.sampleSd.toFixed(6)} |`).join('\n')
    + '\n\nCada fila enlaza mediante receiptIds en aggregate.json con las diez ejecuciones originales. Variabilidad de entrenamiento en un único split; ninguna afirmación de significancia o generalización poblacional.'
    : 'PENDIENTE: cobertura/evidencia insuficiente. No hay tabla de resultados respaldada.';
  const sections = outline.sections.map(section => {
    if (section === 'Título') return '# Demo reproducible de clasificación con ResearchPi\n\nBorrador de demostración; revisión científica y editorial pendientes.';
    if (section === 'Metodología') return '## Metodología\n\n' + methodology;
    if (section === 'Resultados') return '## Resultados\n\n' + results;
    if (section === 'Limitaciones') return '## Limitaciones\n\nDatos sintéticos y un único split. Los presupuestos no se optimizan como benchmark y la demo no establece superioridad general, contribución nueva ni efecto causal. Diez seeds cumple una política del usuario. Se requiere revisión científica.';
    if (section === 'Referencias') return '## Referencias\n\n' + review.references.map(ref => `- [${md(ref.title)}](${ref.url}) — ${ref.status}, consulta ${ref.verifiedAt ?? 'pendiente'}`).join('\n');
    if (section === 'Apéndice de reproducibilidad') return '## Apéndice de reproducibilidad\n\n`node dist/cli.js demo` en proyecto nuevo con versiones fijadas.\n\n' + selected.map(r => `- ${r.methodId}, seed ${r.seed}: [recibo](runs/${r.id}.json), [predicciones](artifacts/${r.id}.json)`).join('\n');
    return '## ' + section + '\n\nPENDIENTE: redactar y revisar con evidencia. No se infiere una contribución científica de esta demo.';
  });
  const report = { mechanicalEvidence: audit, manuscript: review, outline, missing, submissionReady: false };
  writeJson(join(stateDir(project), 'paper-review.json'), report);
  writeJson(join(stateDir(project), 'paper-manifest.json'), manifest);
  const path = join(stateDir(project), 'paper.md');
  writeFileSync(path, sections.join('\n\n') + '\n\n## Perfil de publicación\n\n' + outline.venue?.id + ': ' + outline.venue?.freshnessNote + '\n');
  return { path, reportPath: join(stateDir(project), 'paper-review.json'), report };
}
export function reviewProjectManifest(project: string, manifest: ManuscriptManifest) {
  const frozenPath = join(stateDir(project), 'protocol.json');
  const table = existsSync(frozenPath) && auditProject(project).status === 'complete' ? aggregateProject(project) : undefined;
  return reviewManifest(manifest, table);
}
