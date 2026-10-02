import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
// Packaging scripts intentionally run without npm dependencies.
// @ts-expect-error Plain ESM build helper has no declaration file.
import { verifyReleaseAssets } from '../scripts/verify-release-assets.mjs';
// @ts-expect-error Plain ESM release helper has no declaration file.
import { validateRelease } from '../scripts/validate-release.mjs';
import { ROOT } from '../src/paths.js';

test('Release verification rejects incomplete sets, wrong names and tampered packages', () => {
  const directory = mkdtempSync(join(tmpdir(), 'repi-assets-'));
  const commit = 'a'.repeat(40);
  const names = ['research-pi_0.2.1_amd64.deb', 'research-pi-0.2.1-windows-x64-setup.exe',
    'research-pi-0.2.1-macos-arm64.pkg', 'research-pi-0.2.1-macos-x64.pkg'];
  try {
    assert.throws(() => verifyReleaseAssets(directory, 'v0.2.1', commit), /Missing/);
    for (const name of names) {
      const bytes = Buffer.from(name);
      writeFileSync(join(directory, name), bytes);
      writeFileSync(join(directory, name + '.sha256'), `${createHash('sha256').update(bytes).digest('hex')}  ${name}\n`);
    }
    const result = verifyReleaseAssets(directory, 'v0.2.1', commit);
    assert.equal(result.assets.length, 4); assert.equal(result.commit, commit);
    assert.throws(() => verifyReleaseAssets(directory, 'v0.2.2', commit), /Missing/);
    assert.throws(() => verifyReleaseAssets(directory, '--help', commit), /Invalid/);
    writeFileSync(join(directory, names[0]!), 'tampered');
    assert.throws(() => verifyReleaseAssets(directory, 'v0.2.1', commit), /Checksum/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('Release tags must match the package version and belong to main history', () => {
  const directory = mkdtempSync(join(tmpdir(), 'repi-tag-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: directory, stdio: 'pipe' });
  try {
    git('init', '-b', 'main'); git('config', 'user.name', 'Release test'); git('config', 'user.email', 'test@example.invalid');
    writeFileSync(join(directory, 'package.json'), '{"version":"0.2.1"}'); git('add', '.'); git('commit', '-m', 'base');
    git('update-ref', 'refs/remotes/origin/main', 'HEAD'); git('tag', 'v0.2.1'); git('tag', 'v0.2.2');
    assert.equal(validateRelease('v0.2.1', directory).tag, 'v0.2.1');
    assert.throws(() => validateRelease('v0.2.2', directory), /does not match/);
    assert.throws(() => validateRelease('--help', directory), /Release tag/);
    git('switch', '-c', 'unmerged'); writeFileSync(join(directory, 'package.json'), '{"version":"0.2.3"}');
    git('add', '.'); git('commit', '-m', 'unmerged'); git('tag', 'v0.2.3');
    assert.throws(() => validateRelease('v0.2.3', directory));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('The primary installed CLI is repi and help uses that name', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.bin.repi, 'repi'); assert.equal(pkg.license, 'MIT');
  const help = execFileSync(process.execPath, [join(ROOT, 'dist/cli.js'), '--help'], { encoding: 'utf8' });
  assert.match(help, /Usage: repi/);
});
