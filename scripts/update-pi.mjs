// Dependency-free, staged SDK updates. Never run the standalone Pi updater.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const packages = ['@earendil-works/pi-ai', '@earendil-works/pi-coding-agent'];
const json = path => JSON.parse(readFileSync(path, 'utf8'));
export function commitUpdate(root, stage) {
  const names = ['package.json', 'package-lock.json', 'node_modules', 'dist'];
  const backup = mkdtempSync(join(root, '.repi-backup-'));
  const moved = [], installed = [];
  try {
    for (const name of names) {
      if (existsSync(join(root, name))) { renameSync(join(root, name), join(backup, name)); moved.push(name); }
      renameSync(join(stage, name), join(root, name)); installed.push(name);
    }
  } catch (error) {
    for (const name of installed.reverse()) rmSync(join(root, name), { recursive: true, force: true });
    for (const name of moved.reverse()) renameSync(join(backup, name), join(root, name));
    throw error;
  } finally { rmSync(backup, { recursive: true, force: true }); }
}
export function runUpdate(root, args = [], run = execute) {
  if (args.some(arg => !['--check', '--help', '-h'].includes(arg))) throw new Error('Usage: repi update [--check]');
  if (args.includes('--help') || args.includes('-h')) { console.log('repi update [--check]\nUpdate both Pi SDK dependencies, build and verify before activation. --check only checks versions.'); return; }
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const bundledNpm=join(dirname(process.env.RESEARCH_PI_BASE_ROOT || root),'runtime','npm','bin','npm-cli.js');
  const npmRun=(args,cwd) => existsSync(bundledNpm) ? run(process.execPath,[bundledNpm,...args],cwd) : run(npm,args,cwd);
  const pkg = json(join(root, 'package.json'));
  const current = packages.map(name => json(join(root, 'node_modules', name, 'package.json')).version);
  const latest = packages.map(name => JSON.parse(npmRun(['view', name, 'version', '--json'], root).stdout.trim()));
  for (let i = 0; i < packages.length; i++) {
    if (!/^\d+\.\d+\.\d+$/.test(latest[i])) throw new Error('The registry did not return a stable SDK version.');
    console.log(`${packages[i]}: ${current[i]} → ${latest[i]}`);
  }
  if (args.includes('--check')) return;
  // A native installation uses a per-user runtime overlay; the system package stays intact.
  const native = existsSync(join(root, 'package-runtime.json'));
  const base = process.env.RESEARCH_PI_BASE_ROOT || root;
  const pointer = process.env.RESEARCH_PI_UPDATE_POINTER;
  if (native && !pointer) throw new Error('Start the update through repi so its per-user runtime can be selected.');
  const parent = native ? dirname(pointer) : root;
  mkdirSync(parent, { recursive: true });
  const lock = join(parent, '.repi-update-lock');
  try { mkdirSync(lock); } catch { throw new Error(`Another update is running, or an interrupted update left ${lock}. Close other updates before removing that lock.`); }
  let stage;
  let activated = false;
  try {
    stage = mkdtempSync(join(parent, '.repi-update-'));
    for (const name of ['src','resources','python','docs','assets','examples','scripts','tests','tsconfig.json','package.json','package-lock.json','repi','research-pi','requirements.lock','LICENSE','THIRD_PARTY_NOTICES.md','package-runtime.json']) {
      if (existsSync(join(root, name))) cpSync(join(root, name), join(stage, name), { recursive: true });
    }
    for (let i = 0; i < packages.length; i++) pkg.dependencies[packages[i]] = latest[i];
    writeFileSync(join(stage, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
    console.log('Installing the candidate SDK in an isolated directory…');
    npmRun(['install','--ignore-scripts','--no-audit','--no-fund'], stage);
    for (let i = 0; i < packages.length; i++) if (json(join(stage,'node_modules',packages[i],'package.json')).version !== latest[i]) throw new Error('Installed SDK version does not match the registry target.');
    console.log('Checking compilation, offline SDK response, tools and conversation compatibility…');
    run(process.execPath, ['node_modules/typescript/bin/tsc'], stage);
    const smoke = mkdtempSync(join(tmpdir(), 'repi-update-smoke-'));
    const env = { ...process.env, RESEARCH_PI_DATA_DIR: join(smoke,'data'), PI_OFFLINE:'1' };
    try {
      const cli = join(stage,'dist','cli.js');
      const resources = JSON.parse(run(process.execPath,[cli,'--project',smoke,'resources'],stage,env).stdout);
      if (!resources.tools.includes('project_status') || !resources.tools.includes('bash')) throw new Error('Required tools were not loaded.');
      const response = run(process.execPath,[cli,'--project',smoke,'chat','--offline','[tool:project_status]'],stage,env);
      if (!/project_status · done/.test(response.stdout + response.stderr) || !response.stdout.includes('ResearchPi OFFLINE TEST') || /Extension error/.test(response.stderr)) throw new Error('Offline SDK/tool roundtrip failed.');
      const streamed=run(process.execPath,[cli,'--project',smoke,'chat','--offline','--json','[tool:project_status]'],stage,env);
      const events=streamed.stdout.trim().split('\n').map(line=>JSON.parse(line));
      if (/Extension error/.test(streamed.stderr) || !events.some(event=>event.type==='tool_execution_end' && event.toolName==='project_status' && !event.isError)) throw new Error('JSON streaming/tool roundtrip failed.');
      const tests = ['agent','pi-features','cli','connections'].map(name => `tests/${name}.test.ts`).filter(name => existsSync(join(stage,name)));
      if (tests.length) {run(process.execPath,['--import','tsx','--test',...tests],stage,env);console.log('SDK, session, CLI and connection regression tests passed.');}
    } finally { rmSync(smoke,{recursive:true,force:true}); }
    if (native) {
      const pending = pointer + '.tmp';
      writeFileSync(pending,JSON.stringify({root:stage,base,version:pkg.version,pi:latest,verifiedAt:new Date().toISOString()}));
      renameSync(pending,pointer);
      activated = true;
    } else commitUpdate(root,stage);
    console.log('Pi SDK update verified and activated. Restart open ResearchPi sessions. No live provider request was made.');
  } finally {
    if (stage && !activated) rmSync(stage,{recursive:true,force:true});
    rmSync(lock,{recursive:true,force:true});
  }
}
function execute(exe,args,cwd,env = process.env) {
  const result = spawnSync(exe,args,{cwd,env,encoding:'utf8',timeout:600000,maxBuffer:16*1024*1024,shell:process.platform === 'win32' && exe.endsWith('.cmd')});
  if (result.error || result.status !== 0) throw new Error(`${exe} ${args[0]} failed: ${result.error?.message || result.stderr || result.stdout || result.signal || result.status}. The previous runtime remains active. Node.js with npm must be installed for SDK updates.`);
  return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runUpdate(resolve(process.argv[2]),process.argv.slice(3)); }
  catch (error) { console.error(error.message); process.exitCode=1; }
}
