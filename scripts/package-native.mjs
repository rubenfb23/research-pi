#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = process.argv[2] ?? ({ linux: 'deb', win32: 'windows', darwin: 'macos' }[process.platform]);
const expected = { deb: 'linux', windows: 'win32', macos: 'darwin' }[target];
if (!expected || process.platform !== expected || !['x64', 'arm64'].includes(process.arch)) {
  throw new Error('Construye deb/windows/macos en su sistema nativo, con arquitectura x64 o arm64.');
}
function run(exe, args, cwd = root) {
  const result = spawnSync(exe, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' && exe.endsWith('.cmd') });
  if (result.error || result.status !== 0) throw new Error(`Falló ${exe}: ${result.error?.message ?? result.status}`);
}
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version;
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('La versión del instalador debe ser semántica sin sufijo.');
run(process.execPath, ['node_modules/typescript/bin/tsc']);
const stage = join(root, 'build', `${target}-${process.arch}`);
rmSync(stage, { recursive: true, force: true }); mkdirSync(stage, { recursive: true });
const payload = join(stage, 'payload');
const app = join(payload, 'app');
mkdirSync(app, { recursive: true });
for (const name of ['dist', 'src', 'python', 'resources', 'docs', 'package.json', 'package-lock.json', 'requirements.lock', 'repi', 'research-pi', 'LICENSE', 'README.md', 'THIRD_PARTY_NOTICES.md']) {
  cpSync(join(root, name), join(app, name), { recursive: true });
}
writeFileSync(join(app, 'package-runtime.json'), JSON.stringify({ version, platform: process.platform,
  arch: process.arch, node: process.versions.node, nodeSha256: sha(process.execPath) }, null, 2) + '\n');
// Production dependencies retain their distributed license files and lockfile integrity.
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], app);
const runtime = join(payload, 'runtime'); mkdirSync(runtime, { recursive: true });
const nodeName = process.platform === 'win32' ? 'node.exe' : 'node';
cpSync(process.execPath, join(runtime, nodeName)); chmodSync(join(runtime, nodeName), 0o755);
const licenseResponse = await fetch(`https://raw.githubusercontent.com/nodejs/node/v${process.versions.node}/LICENSE`);
if (!licenseResponse.ok) throw new Error('No se pudo conservar la licencia del runtime Node.');
writeFileSync(join(runtime, 'Node-LICENSE.txt'), await licenseResponse.text());
const release = join(root, 'release'); mkdirSync(release, { recursive: true });
let output;
const unixCommand = install => `#!/bin/sh\nexec "${install}/runtime/node" "${install}/app/repi" "$@"\n`;
if (target === 'deb') {
  const packageRoot = join(stage, 'deb');
  const install = '/opt/research-pi';
  mkdirSync(join(packageRoot, 'opt'), { recursive: true }); cpSync(payload, join(packageRoot, 'opt', 'research-pi'), { recursive: true });
  mkdirSync(join(packageRoot, 'usr', 'bin'), { recursive: true });
  writeFileSync(join(packageRoot, 'usr', 'bin', 'repi'), unixCommand(install), { mode: 0o755 });
  mkdirSync(join(packageRoot, 'DEBIAN'), { recursive: true });
  const arch = process.arch === 'x64' ? 'amd64' : 'arm64';
  writeFileSync(join(packageRoot, 'DEBIAN', 'control'), `Package: research-pi\nVersion: ${version}\nSection: science\nPriority: optional\nArchitecture: ${arch}\nMaintainer: ResearchPi <research-pi@users.noreply.github.com>\nDepends: libc6 (>= 2.28), libstdc++6, ca-certificates\nRecommends: python3 (>= 3.14), python3-venv\nHomepage: https://github.com/rubenfb23/research-pi\nDescription: ResearchPi scientific command line harness on the Pi SDK\n Includes Node and production dependencies. Start with repi.\n Python 3.14 is optional for the experiment runner.\n`);
  output = join(release, `research-pi_${version}_${arch}.deb`);
  run('dpkg-deb', ['--root-owner-group', '--build', packageRoot, output]);
} else if (target === 'macos') {
  const packageRoot = join(stage, 'pkg');
  mkdirSync(join(packageRoot, 'Library'), { recursive: true }); cpSync(payload, join(packageRoot, 'Library', 'ResearchPi'), { recursive: true });
  const bin = join(packageRoot, 'usr', 'local', 'bin'); mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'repi'), unixCommand('/Library/ResearchPi'), { mode: 0o755 });
  output = join(release, `research-pi-${version}-macos-${process.arch}.pkg`);
  run('pkgbuild', ['--root', packageRoot, '--identifier', 'com.researchpi.cli', '--version', version,
    '--install-location', '/', '--ownership', 'recommended', output]);
} else {
  cpSync(join(root, 'packaging', 'windows-path.ps1'), join(payload, 'windows-path.ps1'));
  writeFileSync(join(payload, 'repi.cmd'), '@echo off\r\n"%~dp0runtime\\node.exe" "%~dp0app\\repi" %*\r\nexit /b %errorlevel%\r\n');
  output = join(release, `research-pi-${version}-windows-${process.arch}-setup.exe`);
  const compiler = process.env.RESEARCH_PI_MAKENSIS ?? 'C:\\Program Files (x86)\\NSIS\\makensis.exe';
  run(compiler, [`/DOUTPUT=${output}`, `/DPAYLOAD=${resolve(payload)}`, `/DVERSION=${version}`, join(root, 'packaging', 'windows.nsi')]);
}
writeFileSync(output + '.sha256', `${sha(output)}  ${output.split(/[\\/]/).at(-1)}\n`);
console.log(`Instalador generado: ${output}`);
