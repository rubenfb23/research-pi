import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { demoProtocol, freezeProtocol } from '../src/protocol.js';
import { draftPaper, outlinePaper, reviewManifest, venueProfiles } from '../src/papers.js';
import { getNote } from '../src/science.js';

test('H4: paper profiles vary by contribution, venue snapshots mark expiry/staleness', () => {
  assert(outlinePaper('theory').sections.includes('Proofs'));
  assert(outlinePaper('dataset').sections.includes('Rights and consent'));
  assert.equal(venueProfiles(new Date('2026-10-02T12:00:00Z')).find(v => v.name === 'NeurIPS')?.submissionWindowPassed, true);
  assert(venueProfiles(new Date('2027-01-01T00:00:00Z')).every(v => v.stale));
  assert.throws(() => outlinePaper('imaginary'), /Unknown/);
});
test('H4: unsupported numbers/references stay pending even if declared verified by caller', () => {
  const result = reviewManifest({ claims: [{ id: 'fake', text: 'Accuracy 0.99', numericValue: 0.99 }],
    references: [{ id: 'fake-ref', title: 'Fake reference', url: 'https://example.invalid', status: 'verified' }] });
  assert.equal(result.status, 'pending');
  assert.equal(result.references[0]?.status, 'pending');
  assert.equal(result.claims[0]?.status, 'pending');
  const source = getNote('mensh-kording');
  const valid = reviewManifest({ claims: [{ id: 'reading', text: 'Consult editorial recommendations', referenceIds: [source.id] }],
    references: [{ id: source.id, title: source.title, url: source.sourceUrl }] });
  assert.equal(valid.status, 'mechanically_linked');
  assert.equal(valid.scientificReviewPending, true);
});
test('H4: absent results produce planned methodology and no invented table', () => {
  const project = mkdtempSync(join(tmpdir(), 'researchpi-paper-'));
  try {
    freezeProtocol(project, demoProtocol());
    const draft = draftPaper(project);
    const text = readFileSync(draft.path, 'utf8');
    for (const section of ['Methodology', 'Results', 'Limitations', 'References', 'Reproducibility appendix']) {
      assert(text.includes('## ' + section), section);
    }
    assert.match(text, /PLAN PENDING/);
    assert.match(text, /No supported results table is available/);
    assert.equal(draft.report.mechanicalEvidence.status, 'incomplete');
  } finally { rmSync(project, { recursive: true, force: true }); }
});
