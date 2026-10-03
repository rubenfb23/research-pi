import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const exe = process.argv[2] || 'repi';
const app = process.argv[3];
if (!app) throw new Error('Specify the executable and app directory of the installed package.');
const project = mkdtempSync(join(tmpdir(), 'repi-installed project-'));
const data = process.platform === 'win32' ? join(process.env.LOCALAPPDATA, 'ResearchPi')
  : process.platform === 'darwin' ? join(homedir(), 'Library/Application Support/ResearchPi')
  : join(process.env.XDG_DATA_HOME || join(homedir(), '.local/share'), 'research-pi');
const env = { ...process.env, LANG: 'es_ES.UTF-8', LC_ALL: 'es_ES.UTF-8' }; delete env.RESEARCH_PI_DATA_DIR;
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
  assert(existsSync(join(app,'assets/banner.svg')));assert(existsSync(join(app,'examples/custom-classifier.py')));
  const diagnostic=JSON.parse(run(['doctor']).stdout);assert.equal(diagnostic.connection.modelAccessVerified,false);
  const bench=JSON.parse(run(['bench','run','--agent','fixture','--tasks','metrics-2','--trials','1']).stdout);assert.equal(bench.fixtureOnly,true);assert.equal(bench.completedTrials,1);
  assert.equal(JSON.parse(run(['bench','audit',bench.id]).stdout).status,'complete');
  const initialized=JSON.parse(run(['--project',join(project,'real-study'),'init','--custom-method',join(app,'examples/custom-classifier.py'),'--method-description','Installed adapter fixture']).stdout);
  assert.equal(initialized.protocol.dataset.kind,'breast_cancer');assert.equal(initialized.protocol.trainingSeeds.length,10);assert.equal(initialized.protocol.methods.length,3);
  assert(existsSync(join(app, 'docs/Pi-LICENSE.txt')));
  const policy = readFileSync(join(app, 'resources/manuscript-policy.md'), 'utf8').trim();
  const promptModule = pathToFileURL(join(app, 'dist/prompts.js')).href;
  const prompt = spawnSync(join(app, '..', 'runtime', process.platform === 'win32' ? 'node.exe' : 'node'),
    ['--input-type=module', '--eval', `import { researchSystemPrompt } from ${JSON.stringify(promptModule)}; process.stdout.write(researchSystemPrompt());`],
    { encoding: 'utf8', timeout: 30000 });
  assert.equal(prompt.status, 0, prompt.error?.message || prompt.stderr);
  assert(prompt.stdout.includes(policy), 'Installed runtime must load the full bundled manuscript policy');
  assert.match(prompt.stdout, /ten distinct/);
  assert.match(prompt.stdout, /Web research workflow/);
  const webStatus = JSON.parse(run(['web','status']).stdout);
  assert.equal(webStatus.directReading,true); assert.equal(webStatus.searchApiRequired,false);
  const webSmoke = spawnSync(join(app,'..','runtime',process.platform === 'win32' ? 'node.exe' : 'node'),
    [fileURLToPath(new URL('./smoke-web.mjs',import.meta.url)),app],{encoding:'utf8',timeout:70000});
  assert.equal(webSmoke.status,0,webSmoke.error?.message || webSmoke.stderr);
  console.log(webSmoke.stdout.trim());
  const piSmoke=spawnSync(join(app,'..','runtime',process.platform === 'win32' ? 'node.exe' : 'node'),
    [fileURLToPath(new URL('./smoke-pi-features.mjs',import.meta.url)),app],{encoding:'utf8',timeout:30000});
  assert.equal(piSmoke.status,0,piSmoke.error?.message || piSmoke.stderr);console.log(piSmoke.stdout.trim());
  const clipboard=JSON.parse(run(['clipboard']).stdout);
  assert.equal(clipboard.platform,process.platform);assert.equal(clipboard.verified,false);
  if(process.platform==='linux') {
    assert.equal(clipboard.tools.waylandCopy,true);assert.equal(clipboard.tools.waylandPaste,true);assert.equal(clipboard.tools.x11,true);
    console.log('Installed clipboard prerequisites verified: Wayland and X11 tools available. Desktop access requires a graphical session.');
  }
  for (const provider of ['opencode', 'opencode-go']) {
    assert(JSON.parse(run(['models', provider]).stdout).some(model => model.id === 'glm-5.3'));
  }
  const onboarding = run(['connect'], 'offline\n');
  assert.match(onboarding.stderr, /How would you like to connect ResearchPi\?/);
  assert.match(onboarding.stderr, /OpenCode Zen · API key/);
  assert.match(onboarding.stderr, /Option \[1\]:/);
  assert(existsSync(join(data, 'connections', 'config.json')));
  assert.match(run(['model'], 'offline-test\n').stderr, /Choose a model/);
  const first = run([], '/model\noffline-test\n/models\n/thinking\n/reasoning off\nhello\n[tool:project_status]\n/unknown\n/exit\n');
  assert.match(first.stderr, /ResearchPi.*v[0-9]+\.[0-9]+\.[0-9]+/);
  assert.match(first.stderr, /Active connection: researchpi-mock\/offline-test/);
  assert.match(first.stderr, /Reasoning effort: off/);
  assert.match(first.stderr, /reasoning stream: off/);
  assert.match(first.stdout, /OFFLINE TEST/); assert.match(first.stderr, /Tool: project_status/);
  assert.match(first.stderr, /Unknown command/);
  assert.match(first.stderr, /Tab.*complete/);
  assert(!existsSync(join(project, '.research-pi/input-history.json')), 'Piped input must not populate interactive history');
  // macOS exposes temporary directories through /var -> /private/var.
  assert.equal(realpathSync(JSON.parse(run(['status']).stdout).project), realpathSync(project));
  const pointer = readFileSync(join(project, '.research-pi/session-pointer.json'), 'utf8');
  run(['chat', '--offline', 'resume']);
  assert.equal(readFileSync(join(project, '.research-pi/session-pointer.json'), 'utf8'), pointer);
  assert(!existsSync(join(app, '.research-pi')));
  assert(!existsSync(join(app, '.venv')));
  assert(!existsSync(join(app, 'node_modules/typescript')));
  console.log('Installed CLI verified: English onboarding under Spanish locale, help, version, cwd with spaces, user data, interactive chat, tool call and resume.');
} finally { rmSync(project, { recursive: true, force: true }); }
