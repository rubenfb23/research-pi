# Security policy

ResearchPi is an early-stage project. Security fixes target the current development branch and the most recent release; older releases have no guaranteed support window.

Report vulnerabilities privately using [GitHub private vulnerability reporting](https://github.com/rubenfb23/research-pi/security/advisories/new). Include the affected version, reproduction steps, impact, and a minimal redacted example. Do not put API keys, OAuth tokens, private conversations, or sensitive research data in a public issue.

Provider credentials are stored locally without encryption, with restrictive permissions on POSIX. ResearchPi's bounded tools limit model actions but are not an operating-system sandbox. Evidence hashes provide consistency checks, not protection against an attacker controlling the user's files. Native installers currently have no publisher signature or macOS notarization.

Known dependency and integrity limitations are recorded in [docs/integrity.md](docs/integrity.md). Preserve third-party license notices when updating dependencies and rerun scientific and platform checks.
