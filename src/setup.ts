import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, pythonVenvDirectory } from './paths.js';
import { fileHash } from './storage.js';

let installing: Promise<void> | undefined;
function command(exe: string, args: string[], signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(exe, args, { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'], signal });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Python setup did not complete (${code}).`)));
  });
}
export async function ensureExperiments(signal?: AbortSignal): Promise<void> {
  // Advanced callers explicitly own their selected Python environment.
  if (process.env.RESEARCH_PI_PYTHON) return;
  if (installing) return installing;
  installing = (async () => {
    signal?.throwIfAborted();
    const venv = pythonVenvDirectory();
    const python = join(venv, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    const stamp = join(venv, '.research-pi-requirements');
    const digest = fileHash(join(ROOT, 'requirements.lock'));
    if (existsSync(python) && existsSync(stamp) && readFileSync(stamp, 'utf8') === digest) return;
    console.error('Preparing the experiment environment; this is only needed the first time…');
    if (!existsSync(python)) {
      try { await command(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'venv', venv], signal); }
      catch { throw new Error('Install Python 3.14 with venv support and run the command again.'); }
    }
    await command(python, ['-m', 'pip', 'install', '-r', join(ROOT, 'requirements.lock')], signal);
    await command(python, ['-c', 'import numpy, scipy, sklearn'], signal);
    mkdirSync(venv, { recursive: true }); writeFileSync(stamp, digest);
  })();
  try { await installing; } finally { installing = undefined; }
}
