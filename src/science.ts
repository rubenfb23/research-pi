import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { resource } from './paths.js';
import { readJson } from './storage.js';

export interface Note {
  id: string; title: string; authors: string[]; sourceUrl: string; doi?: string;
  sourceSection: string; sourceDate: string; verifiedAt: string;
  kind: 'user_policy' | 'venue_requirement' | 'sourced_guidance' | 'reading_reference';
  topics: string[]; scope: string; summary: string; interpretation: string;
  limitations: string; conflicts: string[]; referenceStatus: 'verified' | 'pending';
}
const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
export function library(): Note[] {
  const notes = readdirSync(resource('library')).filter(n => n.endsWith('.json')).sort()
    .map(n => readJson<Note>(join(resource('library'), n)));
  if (new Set(notes.map(n => n.id)).size !== notes.length) throw new Error('Duplicate source id');
  for (const n of notes) {
    if (!n.id || !n.authors?.length || !n.sourceUrl || !n.sourceSection || !n.sourceDate || !n.verifiedAt
      || !n.scope || !n.kind || !n.summary || !n.interpretation || !n.limitations || !n.referenceStatus) throw new Error('Missing scientific provenance');
  }
  return notes;
}
export function searchLibrary(query: string, topic?: string) {
  const aliases: Record<string, string> = { identificacion: 'identification', causalidad: 'causal', supuestos: 'assumptions', robustez: 'robustness', redactar: 'writing', metodologia: 'methodology', escritura: 'writing', expertos: 'experts', investigadores: 'researchers', reproducibilidad: 'reproducibility' };
  const translated = normalize(query).split(/\s+/).map(word => aliases[word] ?? word).join(' ');
  const tokens = translated.split(/[^a-z0-9]+/).filter(t => t.length > 2 && !['como', 'para', 'the', 'and', 'que', 'una', 'con', 'how', 'should'].includes(t));
  return library().filter(n => !topic || n.topics.some(t => normalize(t) === normalize(topic)))
    .map(note => {
      const tags = normalize(note.topics.join(' ') + ' ' + note.title);
      const text = normalize([note.summary, note.interpretation, note.scope, note.authors.join(' ')].join(' '));
      const score = tokens.reduce((s,t) => s + (tags.includes(t) ? 3 : 0) + (text.includes(t) ? 1 : 0), 0);
      return { score, note };
    }).filter(n => n.score > 0 || (topic && tokens.length === 0)).sort((a,b) => b.score-a.score || a.note.id.localeCompare(b.note.id)).slice(0, 10);
}
export function getNote(id: string): Note {
  const found = library().find(n => n.id === id);
  if (!found) throw new Error('Unknown scientific source id');
  return found;
}
export function scientificProtocol(id: string) {
  if (!['causal', 'experimental', 'methodology'].includes(id)) throw new Error('Unknown protocol id');
  return readJson<{ id: string; title: string; steps: string[]; sourceIds: string[]; reviewBoundary: string }>(join(resource('protocols'), id + '.json'));
}
export interface CausalPlan {
  exposure?: string; outcome?: string; population?: string; horizon?: string; estimand?: string;
  data?: string; graphOrDesign?: string; assumptions?: { statement: string; justification: string }[];
  identification?: { status: 'identified' | 'unidentifiable' | 'unknown'; strategy: string; justification: string };
  estimation?: { estimator: string; compatibility: string; uncertainty: string };
  robustness?: string[]; limitations?: string[];
}
export function reviewCausal(plan: CausalPlan) {
  if (!plan || typeof plan !== 'object') throw new Error('Causal plan must be an object');
  const missing: string[] = [];
  for (const key of ['exposure','outcome','population','horizon','estimand','data','graphOrDesign'] as const) {
    if (typeof plan[key] !== 'string' || !plan[key]?.trim()) missing.push(key);
  }
  if (!Array.isArray(plan.assumptions) || !plan.assumptions.length || plan.assumptions.some(a => !a?.statement?.trim() || !a?.justification?.trim())) missing.push('assumptions_with_justification');
  const identification = plan.identification;
  if (!identification || !['identified', 'unidentifiable', 'unknown'].includes(identification.status)
    || !identification.strategy?.trim() || !identification.justification?.trim()) missing.push('identification_with_justification');
  if (identification?.status !== 'unidentifiable') {
    const estimation = plan.estimation;
    if (!estimation?.estimator?.trim() || !estimation.compatibility?.trim() || !estimation.uncertainty?.trim()) missing.push('compatible_estimation_and_uncertainty');
    if (!Array.isArray(plan.robustness) || !plan.robustness.length || plan.robustness.some(r => typeof r !== 'string' || !r.trim())) missing.push('sensitivity_and_robustness');
  }
  if (!Array.isArray(plan.limitations) || !plan.limitations.length || plan.limitations.some(r => typeof r !== 'string' || !r.trim())) missing.push('bounded_conclusion_limitations');
  const status = identification?.status === 'unidentifiable' ? 'not_identifiable_under_declared_assumptions'
    : missing.length || identification?.status !== 'identified' ? 'insufficient_information' : 'ready_for_scientific_review';
  return { status, missing, canClaimSupportedCausalEffect: false,
    mechanicalCheck: 'Required fields only; stated identification is not automatically proven.',
    scientificReviewPending: ['Defend assumptions with domain evidence', 'Check identification argument and estimator compatibility', 'Review uncertainty, sensitivity and claim scope'],
    sourceIds: scientificProtocol('causal').sourceIds };
}
