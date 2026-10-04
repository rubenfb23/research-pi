# Third-party notices

ResearchPi embeds **Pi 1.0.2** through `@earendil-works/pi-coding-agent` and
`@earendil-works/pi-ai`. Upstream: https://github.com/earendil-works/pi

Pi is MIT licensed, copyright (c) 2025 Mario Zechner. The full notice is retained in
[docs/Pi-LICENSE.txt](docs/Pi-LICENSE.txt). ResearchPi follows the public SDK interfaces;
it does not fork or distribute a modified Pi core. SDK integration patterns are adapted
from Pi's SDK documentation/examples; the retained MIT notice applies to those portions.

Installed npm packages and Python wheels retain their own license files. The source
repository does not vendor node_modules, Python wheels, scientific datasets or book PDFs.
Native installers bundle production npm packages with their distributed license files,
retain this notice and docs/Pi-LICENSE.txt, and include the Node runtime LICENSE (with its
third-party notices) in runtime/Node-LICENSE.txt. Python wheels are installed separately.
New native packages also bundle npm with its full distributed license files for staged SDK updates.
The lockfiles identify the exact dependencies. See `docs/dependency-licenses.md` for
the license metadata inventory; redistributing a bundled application requires preserving
the full notices and checking the actual bundle contents.

The scientific library contains attributed original summaries and links, not copied
papers/books. Source licenses do not derive from Pi. Mensh & Kording's article is
attributed with DOI and authors; other resources have their own rights and terms.

Original ResearchPi code is licensed under MIT; see [LICENSE](LICENSE).
This license does not replace the licenses of Pi, Node, npm dependencies, Python
packages, or referenced scientific publications. Preserve each applicable notice.

## Wisconsin Diagnostic Breast Cancer dataset

The optional real-data study uses the version distributed with pinned scikit-learn. Original dataset: Wolberg, W., Mangasarian, O., Street, N., and Street, W. (1993), *Breast Cancer Wisconsin (Diagnostic)*, UCI Machine Learning Repository, DOI [10.24432/C5DW2B](https://doi.org/10.24432/C5DW2B). The [UCI record](https://archive.ics.uci.edu/dataset/17/breast+cancer+wisconsin+diagnostic) identifies the dataset as CC BY 4.0; [license terms](https://creativecommons.org/licenses/by/4.0/). ResearchPi loads the scikit-learn feature/target arrays, makes a fixed stratified split and records the measured content/split fingerprint. CSV datasets retain the researcher's declared source and permissions; ResearchPi's MIT license does not override those rights.
