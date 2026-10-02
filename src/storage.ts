import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { stateDir } from './paths.js';

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
  }
  return JSON.stringify(value) ?? 'null';
}
export const hash = (v: unknown) => createHash('sha256').update(canonical(v)).digest('hex');
export const fileHash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
export function readJson<T>(path: string): T { return JSON.parse(readFileSync(path, 'utf8')) as T; }
export function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = path + '.' + randomUUID() + '.tmp';
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  renameSync(tmp, path);
}
export function projectStatus(project: string) {
  const dir = stateDir(project);
  const frozen = join(dir, 'protocol.json');
  return {
    project, protocol: existsSync(frozen) ? readJson(frozen) : null,
    scientificState: 'Stored separately from Pi conversation; use audit to check current evidence.',
  };
}
