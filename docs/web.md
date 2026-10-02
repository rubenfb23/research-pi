# Local web research

ResearchPi 1.3.0 registers native web tools with the Pi SDK. Reading and registry lookup use the bundled Node runtime; JavaScript rendering and public search use your installed Chrome, Chromium or Edge. No paid search provider, API key, new npm dependency or automatic browser download is involved. Websites and bibliographic registries are still contacted over the internet.

## Getting started

```sh
repi web status
repi web read https://example.com
repi web open https://scikit-learn.org/stable/modules/cross_validation.html
repi web papers "Ten simple rules for structuring papers" --limit 3
repi web search "machine learning reproducibility"
```

Inside the chat, request the research normally, for example: `Find recent papers on causal representation learning, read the original sources and cite them.` The model receives the web tools and the bundled research workflow. Tool availability does not guarantee any model will select or use them correctly.

`read` works without a browser. Chrome/Chromium/Edge is needed for `open`, `follow` and public search. Run `status` to inspect detection. Linux searches executable paths; macOS checks application bundles; Windows checks Chrome and Edge application directories. To select another compatible installation, set `RESEARCH_PI_BROWSER_PATH` to its absolute executable path. Firefox is not supported by this Chromium protocol implementation.

PDF reading uses `pdftotext` only when already installed locally. ResearchPi neither installs nor bundles it. Missing readers and scanned/image-only PDFs remain unsupported; OCR is not implemented. The browser's PDF viewer is not treated as extracted paper text. Model credentials are independent of these web tools, and offline test mode can exercise them without an inference account.

## Tools

| Tool | Purpose |
| --- | --- |
| `web_status` | Browser/PDF-reader availability and the five most recent recorded sources |
| `read_web` | Direct public HTML, JSON, XML, plain-text or native PDF text retrieval |
| `browser_open` | JavaScript-rendered DOM text and numbered links |
| `browser_follow_link` | Follow a recorded link, retaining its parent source ID |
| `search_web` | Search public DuckDuckGo/Bing pages; `auto` tries each at most once |
| `search_papers` | Search Crossref deposited metadata by query, publication years or journal ISSN |
| `get_web_source` | Recover hash-checked evidence and paginate text or links without another request |

`web papers` accepts `--from-year`, `--until-year`, `--issn` and `--limit` (1–10). It does not require a search browser. Deposited metadata can have missing fields or mistakes; it is not proof of reference identity, relevance or source support. Search author lists are limited to 20 names with `authorsComplete` indicating whether the list is complete. Retrieve the original DOI record for complete comparisons. The existing `review-manifest` still checks its curated-source scope rather than promoting web records to verified references.

Public search returns leads rather than read papers. CAPTCHA, HTTP blocking, network errors and empty results stay explicit. In the live Linux checks, DuckDuckGo presented a CAPTCHA, Google (a diagnostic probe, not a supported search engine) returned an access challenge, and Bing returned poorly related results. Do not treat general-search ranking as relevance evidence. Direct Crossref discovery and original-source reading provide a useful independent scientific path. No challenge is solved or bypassed automatically.

## Recorded evidence

Each retrieval writes a source under project `.research-pi/web/sources/<id>.json` and appends a metadata row to `.research-pi/web/journal.jsonl`. Records contain requested/final URLs, retrieval time, transport, HTTP status, extracted content, numbered links, completeness/truncation state and a hash of the stored record. Failed attempts remain visible. Challenge text is replaced with a generic restriction notice rather than retaining diagnostic client details.

These are local plaintext research records, with private file/directory permissions on POSIX. As with experiment state, keep `.research-pi/` out of project Git commits. Source hashes check local consistency; they do not authenticate a publisher or establish scientific validity.

Recover evidence after restart or compaction with the recent source IDs from `web_status`, then `get_web_source`. CLI equivalents:

```sh
repi web source SOURCE_ID --offset 12000 --max-chars 12000
repi web source SOURCE_ID --link-offset 20
repi web follow SOURCE_ID 1
```

Follow `nextOffset` and `nextLinkOffset` to read remaining retained data. Storage caps extracted text at 120,000 characters and 80 links. Replies default to 12,000 characters and a bounded link slice. A storage truncation flag means the remaining original document was not retained; do not claim a complete reading. Crossref search saves an explicit projection of relevant bibliographic fields, not the full registry payload.

## Execution scope

Browser calls use a fresh temporary profile, no personal login/cookie reuse, normal Chromium sandboxing and no arbitrary model-supplied JavaScript, shell commands or form actions. Extraction is fixed host code, with cleaned DOM-text fallback when rendered text is unavailable. Each call closes the browser and removes its profile. Links open by URL in a new browser call, not by submitting a form or executing a JavaScript link.

Public HTTP/HTTPS on ports 80/443 is supported. Local/private/reserved destinations, embedded URL credentials and other schemes are rejected. Redirects and browser subresources use the same address policy; outbound sockets are pinned to validated DNS addresses. Chrome routes through a temporary loopback policy proxy, with implicit loopback bypass removed. Default limits are 25 seconds per operation, five direct redirects, 4 MiB direct/decompressed response size, and 200 browser connections with a 32 MiB traffic budget. Browser search can use two bounded operations. Corporate proxy policies may require additional configuration.

PDFs without extractable text, image interpretation, screenshots, authenticated sites, arbitrary clicks/forms, browser extensions and automated full bibliographic verification remain outside this implementation. Reading a source does not certify compliance with manuscript figure or citation requirements.

## Verification and implementation sources

Tests use a strictly scoped synthetic-server resolver to exercise real HTTP, Chrome JavaScript, saved-link following, public-search CAPTCHA/fallback parsing, PDF extraction, pagination, cancellation, oversized/compressed responses and source tampering. The fixture resolver is supplied by trusted test code and is unavailable through CLI/model parameters. Pi SDK tests dispatch the tools and recover evidence after resume without another network request. Installed-runtime smoke tests run direct retrieval and real browser checks when a compatible local browser exists.

Live Linux checks retrieved the official scikit-learn cross-validation page and Crossref's record for `10.1371/journal.pcbi.1005619`. The paper search returned the requested article, its preprint and a correction. These scoped checks do not establish universal browser, search-engine, model or scientific-reasoning compatibility.

The implementation follows [Pi SDK custom tools](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/docs/sdk.md), [Chrome headless mode](https://developer.chrome.com/docs/automation-and-testing/headless), [isolated Chrome debugging profiles](https://developer.chrome.com/blog/remote-debugging-port), [Chromium proxy behavior](https://chromium.googlesource.com/chromium/src/+/HEAD/net/docs/proxy.md), [DevTools Fetch](https://chromedevtools.github.io/devtools-protocol/1-3/Fetch/), and [Crossref bibliographic query/filter documentation](https://github.com/Crossref/rest-api-doc).
