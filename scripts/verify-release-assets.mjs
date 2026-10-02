import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function verifyReleaseAssets(directory, tag, commit) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag ?? '') || !/^[a-f0-9]{40}$/.test(commit ?? '')) throw new Error('Invalid release tag or commit.');
  const version = tag.slice(1);
  const packages = [`research-pi_${version}_amd64.deb`, `research-pi-${version}-windows-x64-setup.exe`,
    `research-pi-${version}-macos-arm64.pkg`, `research-pi-${version}-macos-x64.pkg`];
  const expected = packages.flatMap(name => [name, name + '.sha256']).sort();
  const actual = readdirSync(directory).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Missing or unexpected release assets. Expected four packages and four checksums.');
  const assets = packages.map(name => {
    const data = readFileSync(join(directory, name));
    if (!data.length) throw new Error(`Empty package: ${name}`);
    const sha256 = createHash('sha256').update(data).digest('hex');
    if (readFileSync(join(directory, name + '.sha256'), 'utf8').trim() !== `${sha256}  ${name}`) throw new Error(`Checksum mismatch: ${name}`);
    return { name, sha256, bytes: data.length };
  });
  return { tag, version, commit, assets };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2];
  const manifest = verifyReleaseAssets(directory, process.argv[3], process.argv[4]);
  writeFileSync(join(directory, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('All four packages and checksums verified. Release manifest written.');
}
