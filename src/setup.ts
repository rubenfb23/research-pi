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
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`No se completó la preparación de Python (${code}).`)));
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
    console.error('Preparando el entorno de experimentos; solo hace falta la primera vez…');
    if (!existsSync(python)) {
      try { await command(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'venv', venv], signal); }
      catch { throw new Error('Instala Python 3.14 con soporte venv y vuelve a ejecutar el comando.'); }
    }
    await command(python, ['-m', 'pip', 'install', '-r', join(ROOT, 'requirements.lock')], signal);
    await command(python, ['-c', 'import numpy, scipy, sklearn'], signal);
    mkdirSync(venv, { recursive: true }); writeFileSync(stamp, digest);
  })();
  try { await installing; } finally { installing = undefined; }
}
