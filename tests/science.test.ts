import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNote, library, reviewCausal, scientificProtocol, searchLibrary, type CausalPlan } from '../src/science.js';

test('H3: bilingual lexical retrieval and provenance with policy/source distinction', () => {
  assert(searchLibrary('identificación causal supuestos').some(r => r.note.id === 'dowhy-causal'));
  assert(searchLibrary('redactar metodología paper').some(r => r.note.id === 'mensh-kording'));
  assert(searchLibrary('', 'experimental').length >= 2);
  assert(library().every(n => n.authors.length && n.sourceSection && n.sourceUrl && n.interpretation));
  assert.equal(getNote('lab-policy').kind, 'user_policy');
  assert.equal(getNote('neurips-checklist').kind, 'venue_requirement');
  assert.throws(() => getNote('../../auth.json'), /Unknown/);
  assert(scientificProtocol('methodology').sourceIds.includes('sklearn-practices'));
});
test('H3: incomplete causal request blocks a supported claim and lists missing steps', () => {
  const result = reviewCausal({ exposure: 'AI use', outcome: 'productivity' });
  assert.equal(result.status, 'insufficient_information');
  assert(result.missing.includes('identification_with_justification'));
  assert(result.missing.includes('assumptions_with_justification'));
  assert.equal(result.canClaimSupportedCausalEffect, false);
});
test('H3: unidentifiable and populated plans are not certified as scientifically valid', () => {
  const plan: CausalPlan = { exposure: 'T', outcome: 'Y', population: 'P', horizon: 't', estimand: 'ATE', data: 'D',
    graphOrDesign: 'Randomized study', assumptions: [{ statement: 'Consistency', justification: 'Defined treatment versions' }],
    identification: { status: 'identified', strategy: 'Randomization', justification: 'Assignment protocol' },
    estimation: { estimator: 'Difference of means', compatibility: 'Random assignment', uncertainty: 'Randomization interval' },
    robustness: ['Check attrition'], limitations: ['Limited to this population'] };
  assert.equal(reviewCausal(plan).status, 'ready_for_scientific_review');
  assert.equal(reviewCausal(plan).canClaimSupportedCausalEffect, false);
  plan.identification!.status = 'unidentifiable';
  assert.equal(reviewCausal(plan).status, 'not_identifiable_under_declared_assumptions');
});
