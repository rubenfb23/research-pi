# Installing ResearchPi 1.5.0

Download your platform's package from [GitHub Releases](https://github.com/rubenfb23/research-pi/releases). Packages install `repi` and include Node, compiled CLI, scientific resources, source, lockfiles, production dependencies and license notices. Startup does not require npm or compilation.

Installers currently have no publisher signature; macOS packages are not notarized. `.sha256` files check consistency with published downloads and do not replace a publisher signature.

## Ubuntu / Debian · x64

```sh
sudo apt install ./research-pi_1.5.0_amd64.deb
repi
```

The app installs to `/opt/research-pi` and the command to `/usr/bin/repi`. The runtime requires glibc >=2.28. Installation is tested on Ubuntu 24.04. Chat needs no Python; experiments need Python 3.14 with venv support. Ubuntu 24.04's default Python 3.12 does not satisfy the pinned experiment environment.

Uninstall with `sudo apt remove research-pi`. User projects, connections and experiment environments are retained.

## Windows · x64

Open `research-pi-1.5.0-windows-x64-setup.exe`. The English installer runs per user at `%LOCALAPPDATA%\Programs\ResearchPi` without administrator privileges and adds that directory to the user PATH. Open a new terminal and run `repi`.

Installation and the executable are tested on a native GitHub Windows runner. Windows may show an unknown-publisher notice for the unsigned installer. Remove the app through Installed Apps or `Uninstall.exe` in its directory. Only its own PATH entry is removed; user data is retained. Python 3.14 available as `python` is optional for scientific experiments.

## macOS · Apple Silicon / Intel

Use `research-pi-1.5.0-macos-arm64.pkg` for Apple Silicon or `research-pi-1.5.0-macos-x64.pkg` for Intel. Open the installer, then run `repi` in a new terminal. Command-line installation is also supported:

```sh
sudo installer -pkg ./research-pi-1.5.0-macos-arm64.pkg -target /
```

The app installs to `/Library/ResearchPi`, with `/usr/local/bin/repi`. Packages are built and tested separately on macOS 15 for each architecture. macOS may block an unsigned, unnotarized installer. Compatibility with other macOS versions is not verified.

To remove the application and installation receipt:

```sh
sudo rm -rf /Library/ResearchPi
sudo rm -f /usr/local/bin/repi
sudo pkgutil --forget com.researchpi.cli
```

Do not remove the command if you have replaced it with another installation. User connections, experiment environments and project data are retained.

## Data and usage

The directory where you run `repi` is the project; `--project <path>` selects another. Protocols, results and web sources live under `<project>/.research-pi/`. Conversations use the shared SDK store in `<ResearchPi data>/pi/conversations/`; legacy histories are imported when visiting each project. Native packages store credentials and the Python environment in per-user directories:

| Platform | User data |
| --- | --- |
| Linux | `$XDG_DATA_HOME/research-pi` or `~/.local/share/research-pi` |
| Windows | `%LOCALAPPDATA%\ResearchPi` |
| macOS | `~/Library/Application Support/ResearchPi` |

The installed application does not write into its system directory. `RESEARCH_PI_DATA_DIR` accepts an absolute directory override for credentials, Pi configuration, conversations and Python. Source checkouts retain their checkout-local storage; credentials are not copied automatically between installation methods.

```sh
repi --help
repi connect opencode
repi connect opencode-go
repi connect codex
repi connect claude
repi --offline
repi --project ./my-study demo
repi --project ./my-study audit
```

`repi` opens the chat and requests connection setup on first use. The interface and default generated content are English regardless of locale. `--offline` tests the harness without scientific reasoning or provider requests. See [connections](connections.md). Real-account provider inference remains unverified.

For multiple installations, `which repi` (Linux/macOS) or `Get-Command repi` (PowerShell) shows the selected executable. An npm/nvm link can precede the native package on PATH. Changing the active nvm Node version may require repeating `npm run install:cli` for that prefix. Remove the npm link with `npm uninstall --global research-pi`; the checkout and its data remain.

## Build packages

Use the target OS and architecture with Node >=22.19 and npm:

```sh
npm ci
npm run package:native -- deb
# macOS: npm run package:native -- macos
# Windows with NSIS: npm run package:native -- windows
```

Builders use `dpkg-deb`, `pkgbuild` or NSIS. `RESEARCH_PI_MAKENSIS` overrides the Windows compiler path. The builder copies its Node executable and records the version, architecture and SHA-256 in `package-runtime.json`.

CI uses Node 22.23.0 and verifies install, English onboarding/help, provider catalogs, offline chat, SDK tool calls, persistence and removal. Native smoke checks do not send real inference or install Python. Separate Linux scientific checks run the test suite and twenty-fit demo. Native CI artifacts remain for fourteen days; published packages are release assets. Local builds appear in `release/`.

Original code is [MIT licensed](../LICENSE). Pi, npm and Node notices are retained. The [known Pi transitive advisory](integrity.md) remains unresolved. See [release automation](releases.md).
