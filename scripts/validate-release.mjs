import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateRelease(tag, cwd = process.cwd()) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag ?? '')) throw new Error('Release tag must be vMAJOR.MINOR.PATCH.');
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const commit = git('rev-parse', '--verify', `refs/tags/${tag}^{commit}`);
  // Publish only reviewed code already merged into the protected default branch.
  git('merge-base', '--is-ancestor', commit, 'refs/remotes/origin/main');
  const version = JSON.parse(git('show', `${commit}:package.json`)).version;
  if (tag !== `v${version}`) throw new Error(`Tag ${tag} does not match package version ${version}.`);
  return { tag, commit };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateRelease(process.argv[2]);
  console.log(`tag=${result.tag}\ncommit=${result.commit}`);
}
