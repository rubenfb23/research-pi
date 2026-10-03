# Reproducible workflows

Commands below assume an installed `repi` and a new study directory. Source users can replace `repi` with `node repi`. Scientific runs require Python 3.14 and the pinned environment; source templates live under `examples/` in the repository or installer application directory.

## 1. Real dataset or your own method

```sh
repi --project ./wisconsin-study demo --dataset breast-cancer
repi --project ./wisconsin-study audit
```

This performs twenty CPU fits on scikit-learn's Wisconsin Diagnostic Breast Cancer data with ten predefined seeds per configuration. Data originate from [UCI](https://doi.org/10.24432/C5DW2B), CC BY 4.0. The small fixed-split study is educational and does not establish clinical performance. [Dataset documentation](https://scikit-learn.org/stable/datasets/toy_dataset.html).

Add a third configuration using the provided Python example:

```sh
repi --project ./custom-study init --custom-method ./examples/custom-classifier.py \
  --method-description "StandardScaler fitted on training data and seeded SGD"
repi --project ./custom-study run
repi --project ./custom-study audit
repi --project ./custom-study aggregate
repi --project ./custom-study paper
```

Expect thirty successful training runs. An adapter defines `fit_predict(x_train, y_train, x_test, seed, hyperparameters)` and returns `(binary_predictions, probabilities_for_class_1)`, one value per test sample. Evaluation labels are not passed to the function. The example fits scaling on training data only. Python dependencies come from `requirements.lock`; arbitrary custom dependencies, helper modules and GPU/remote execution are not managed.

`init` retains a content-addressed `.py` copy under `.research-pi/inputs/`. Snapshot hashes are checked before/during execution and auditing. Changing the original file does not change the frozen copy. Changing a frozen snapshot invalidates the study. Explicit hyperparameters can be set through a complete protocol JSON before freezing. Custom code runs with host-user permissions, without inherited API credentials; no operating-system sandbox or protection against a malicious adapter is claimed. Its source still requires scientific/code review.

Import a CSV with a header, numeric finite features and binary 0/1 labels:

```sh
repi --project ./csv-study init --csv ./data.csv --target label \
  --features feature_a,feature_b --source-url https://example.org/my-dataset \
  --license "Researcher-provided permission; describe actual terms"
repi --project ./csv-study run
repi --project ./csv-study aggregate
```

Replace the example source and permission with actual dataset provenance. The runner supports 100–10,000 observations, 1–100 explicitly selected features and files up to 4 MiB. Target columns cannot be selected as features. Missing/categorical values require a separately documented preprocessing step. Group/temporal sampling, cross-validation, hyperparameter search, regression and clinical evaluation are not implemented here. Review leakage beyond the mechanically checked column selection.

All paths go through a frozen protocol, attempt journal, per-run predictions, metrics recalculation and aggregate links. Cancel with Ctrl+C; historical failures remain visible and require `repi run --retry`. Successful runs are not repeated. Freeze input JSON paths resolve as written; `init` is the supported snapshot preparation path. Moving an entire frozen directory requires updating absolute snapshot paths and refreezing; original hashes/receipts must be preserved separately.

## 2. Literature and bibliographic verification

```sh
repi --project ./literature-study web papers "Ten simple rules for structuring papers" --limit 3
repi --project ./literature-study references verify --file ./examples/reference.json
repi --project ./literature-study references list
```

The example records the title, authors, journal, volume, article number, year and DOI of Mensh and Kording's paper. `verify` resolves the DOI and compares fields against deposited Crossref or DataCite metadata, retaining raw retrieval evidence and a hash-linked verification report under `.research-pi/references/`. A matching report is `metadata_matched`; mismatches are `conflict`; missing/ambiguous/network-limited evidence is `pending`. Conflict/pending reports exit with status 1. A publisher access restriction may still show that the DOI redirects; it does not mean full text was read.

Given-name initials can be compatible with registered full names. Surname initials remain pending. Full author lists, title, journal, volume, pages/article number and year must match the available record. Registry absence is not proof that a DOI is nonexistent. Without a DOI, supplied URLs can be retrieved but bibliographic identity remains pending for human matching. This does not verify source-to-claim support, novelty, retractions/corrections or scientific validity. [Reference verification](references.md).

## 3. Evidence-linked methodology and results

```sh
repi --project ./wisconsin-study paper
repi --project ./wisconsin-study outline --type empirical
```

After a complete audit, `paper` writes methodology/results using the frozen protocol and recalculated aggregation. Numeric claim manifests link configuration, metric and statistic to receipts. Unsupported contribution statements and editorial review remain pending.

To include a previously checked DOI citation, place the same reference identity in a manuscript manifest and run `paper --manifest manifest.json` or `review-manifest --file manifest.json`. The verifier checks stored report/source hashes and identity; a user-written `status: verified` is ignored. Bibliographic matching permits mechanical links; semantic citation support still requires scientific review. LaTeX/BibTeX export and arbitrary manuscript claim extraction remain future work.
