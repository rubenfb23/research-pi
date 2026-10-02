import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';

const exe = process.argv[2] || 'repi';
const app = process.argv[3];
if (!app) throw new Error('Indica el ejecutable y la carpeta app del paquete instalado.');
const project = mkdtempSync(join(tmpdir(), 'repi-installed project-'));
const data = process.platform === 'win32' ? join(process.env.LOCALAPPDATA, 'ResearchPi')
  : process.platform === 'darwin' ? join(homedir(), 'Library/Application Support/ResearchPi')
  : join(process.env.XDG_DATA_HOME || join(homedir(), '.local/share'), 'research-pi');
const env = { ...process.env }; delete env.RESEARCH_PI_DATA_DIR;
function run(args, input = '') {
  const result = spawnSync(exe, args, { cwd: project, encoding: 'utf8', input, env,
    shell: process.platform === 'win32', timeout: 30000 });
  assert.equal(result.status, 0, result.error?.message || result.stderr);
  return result;
}
try {
  assert.match(run(['--help']).stdout, /Usage: repi/);
  assert.equal(run(['--version']).stdout.trim(), JSON.parse(readFileSync(join(app, 'package.json'), 'utf8')).version);
  assert(existsSync(join(app, 'LICENSE')));
  assert(existsSync(join(app, 'docs/Pi-LICENSE.txt')));
  run(['connect', 'offline']);
  assert(existsSync(join(data, 'connections', 'config.json')));
  const first = run([], 'hola\n[tool:project_status]\n/exit\n');
  assert.match(first.stdout, /OFFLINE TEST/); assert.match(first.stderr, /Herramienta: project_status/);
  // macOS exposes temporary directories through /var -> /private/var.
  assert.equal(realpathSync(JSON.parse(run(['status']).stdout).project), realpathSync(project));
  const pointer = readFileSync(join(project, '.research-pi/session-pointer.json'), 'utf8');
  run(['chat', '--offline', 'resume']);
  assert.equal(readFileSync(join(project, '.research-pi/session-pointer.json'), 'utf8'), pointer);
  assert(!existsSync(join(app, '.research-pi')));
  assert(!existsSync(join(app, '.venv')));
  assert(!existsSync(join(app, 'node_modules/typescript')));
  console.log('Installed CLI verified: help, version, cwd with spaces, user data, interactive chat, tool call and resume.');
} finally { rmSync(project, { recursive: true, force: true }); }
