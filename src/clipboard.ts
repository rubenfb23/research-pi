import { accessSync, constants, existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { installationDataDirectory } from './paths.js';

const directory = () => join(installationDataDirectory(),'clipboard');

/** Pi's native clipboard routes remain authoritative; add user-installed Linux helpers. */
export function configureClipboard() {
  if (process.platform !== 'linux') return;
  const bin=join(directory(),'usr/bin');
  if (!existsSync(bin)) return;
  const paths=(process.env.PATH ?? '').split(delimiter);
  if (!paths.includes(bin)) process.env.PATH=[bin,...paths].join(delimiter);
}

function available(command:string) {
  return (process.env.PATH ?? '').split(delimiter).some(path => {
    try { accessSync(join(path,command),constants.X_OK); return true; } catch { return false; }
  });
}

/** Checks prerequisites without reading or changing clipboard contents. */
export function clipboardStatus() {
  configureClipboard();
  if (process.platform !== 'linux') return {platform:process.platform,backend:'Pi native system clipboard',copyCommand:'/copy',copyKey:'Ctrl+X',verified:false};
  const waylandCopy=available('wl-copy'),waylandPaste=available('wl-paste');
  const x11=available('xclip') || available('xsel');
  const remote=Boolean(process.env.SSH_CONNECTION || process.env.SSH_CLIENT || process.env.MOSH_CONNECTION);
  const desktop=Boolean(process.env.WAYLAND_DISPLAY || process.env.DISPLAY);
  return {platform:'linux',session:process.env.WAYLAND_DISPLAY ? 'wayland' : process.env.DISPLAY ? 'x11' : 'headless',
    tools:{waylandCopy,waylandPaste,x11},desktopCopyAvailable:Boolean(process.env.WAYLAND_DISPLAY && waylandCopy || process.env.DISPLAY && x11),
    terminalClipboardFallback:remote || !desktop,verified:false,
    copyCommand:'/copy',copyKey:'Ctrl+X',setup:'repi setup --clipboard',
    note:'Tool availability does not verify desktop access. Copy a message and paste it in another application.'};
}

function command(exe:string,args:string[],cwd:string) {
  return new Promise<void>((resolve,reject) => {
    const child=spawn(exe,args,{cwd,stdio:['ignore','inherit','inherit']});
    const timer=setTimeout(()=>child.kill('SIGKILL'),30000);
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('close',code=>{clearTimeout(timer);code===0 ? resolve() : reject(new Error('Clipboard setup failed. Install wl-clipboard and xclip with your system package manager.'));});
  });
}

/** Use configured, authenticated apt repositories; no sudo or global PATH changes. */
export async function ensureClipboardTools() {
  configureClipboard();
  if (process.platform !== 'linux' || available('wl-copy') && available('wl-paste') && (available('xclip') || available('xsel'))) return clipboardStatus();
  if (!available('apt-get') || !available('dpkg-deb')) throw new Error('Install wl-clipboard and xclip using your Linux package manager, then restart repi.');
  const data=installationDataDirectory();mkdirSync(data,{recursive:true,mode:0o700});
  const stage=mkdtempSync(join(data,'clipboard-setup-')),payload=join(stage,'payload'),backup=join(stage,'previous');
  mkdirSync(payload);
  try {
    console.error('Preparing local Wayland/X11 clipboard helpers…');
    await command('apt-get',['download','wl-clipboard','xclip'],stage);
    const packages=readdirSync(stage).filter(name=>name.endsWith('.deb'));
    if (packages.length !== 2) throw new Error('Clipboard package download was incomplete.');
    for (const file of packages) await command('dpkg-deb',['--extract',join(stage,file),payload],stage);
    for (const tool of ['wl-copy','wl-paste','xclip']) {
      const result=spawnSync(join(payload,'usr/bin',tool),[tool==='xclip' ? '-version' : '--version'],{timeout:3000,stdio:'ignore'});
      if (result.status !== 0) throw new Error('Clipboard helpers need system libraries. Install wl-clipboard and xclip with your system package manager.');
    }
    if (existsSync(directory())) renameSync(directory(),backup);
    try { renameSync(payload,directory()); }
    catch (error) { if (existsSync(backup)) renameSync(backup,directory()); throw error; }
    configureClipboard();
    return clipboardStatus();
  } finally {rmSync(stage,{recursive:true,force:true});}
}
