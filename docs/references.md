# Bibliographic verification

`repi references verify --file reference.json` accepts one object or an array. The SDK tool is `verify_reference`, with `referenceJson`. Fields:

```json
{
  "id": "mensh-kording-2017",
  "doi": "10.1371/journal.pcbi.1005619",
  "title": "Ten simple rules for structuring papers",
  "authors": ["Brett Mensh", "Konrad Kording"],
  "journal": "PLOS Computational Biology",
  "volume": "13",
  "pages": "e1005619",
  "year": 2017,
  "url": "https://doi.org/10.1371/journal.pcbi.1005619"
}
```

The reader uses existing public HTTP tools; no additional package, account or paid search service is required. DOI redirects and registry responses are retained as web sources. Crossref is attempted first, with DataCite fallback. Title/venue/volume/pages matching normalizes Unicode composition and whitespace; it does not forgive changed wording. Given-name initials and accent normalization apply to author compatibility; author order/count and full surnames matter. Ambiguous surname initials remain pending. Missing deposited fields are not fabricated. Full author identity, source quality and source-to-claim relevance remain separate judgments.

Each report stores checks, expected/observed values, dates, source IDs, scope and a verification hash. Manifest review accepts metadata status only when reference identity, report hash and all referenced source hashes match. These are consistency checks on a local evidence store, not signatures or protection against a user rebuilding it.

A matching citation does not verify the paper's conclusions or its latest correction/retraction status. For non-DOI items, source retrieval remains discovery; human bibliographic matching is pending. The implementation does not claim an exhaustive Google or journal-specific literature search.

API/registry sources: [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/), [DataCite API](https://support.datacite.org/docs/api).
