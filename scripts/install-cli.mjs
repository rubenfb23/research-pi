#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
function run(exe, args) {
  const result = spawnSync(exe, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' && exe.endsWith('.cmd') });
  if (result.error) { console.error(`No se pudo iniciar ${exe}: ${result.error.message}`); process.exit(1); }
  if (result.status !== 0) process.exit(result.signal === 'SIGINT' ? 130 : result.status ?? 1);
}
run(process.execPath, [join(root, 'research-pi'), 'setup']);
// npm owns the executable links and checks collisions; no sudo, force or shell edits.
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['link', '--no-audit', '--no-fund']);
console.log('\nrepi instalado en el prefijo de npm. Desde cualquier carpeta: repi');
console.log('Ayuda: repi --help · Conectar: repi connect codex · Prueba: repi --offline');
console.log('El checkout debe permanecer en esta ubicación. Si tu shell no encuentra repi, revisa que el bin del prefijo de npm esté en PATH.');
