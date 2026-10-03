import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT } from '../src/paths.js';
import { mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

test('Pi clipboard helper discovery preserves Unicode and multiline bytes without global PATH changes', {skip:process.platform !== 'linux'}, () => {
  const directory=mkdtempSync(join(tmpdir(),'repi-copy-utf8-'));
  try {
    const bin=join(directory,'clipboard/usr/bin');mkdirSync(bin,{recursive:true});
    const record=join(directory,'copied.txt');
    writeFileSync(join(bin,'wl-copy'),'#!'+process.execPath+'\n'+
      'const fs=require("node:fs");const chunks=[];process.stdin.on("data",s=>chunks.push(s));process.stdin.on("end",()=>fs.writeFileSync(process.env.REPI_COPY_RECORD,Buffer.concat(chunks)));\n',{mode:0o755});
    const source='Measured α = 0.05; español Ñ\n'+ 'β² '.repeat(5000);
    const script=`import {configureClipboard,clipboardStatus} from ${JSON.stringify(pathToFileURL(join(ROOT,'dist/clipboard.js')).href)};
      import {copyToClipboard} from '@earendil-works/pi-coding-agent';
      configureClipboard();configureClipboard();await copyToClipboard(${JSON.stringify(source)});
      console.log(JSON.stringify(clipboardStatus()));`;
    const originalPath=process.env.PATH;
    const result=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:ROOT,encoding:'utf8',timeout:10000,
      env:{...process.env,RESEARCH_PI_DATA_DIR:directory,REPI_COPY_RECORD:record,PATH:'/usr/bin:/bin',WAYLAND_DISPLAY:'repi-fixture',DISPLAY:'',SSH_CONNECTION:'',SSH_CLIENT:'',MOSH_CONNECTION:''}});
    assert.equal(result.status,0,result.stderr);assert.equal(readFileSync(record,'utf8'),source);
    const status=JSON.parse(result.stdout);assert.equal(status.desktopCopyAvailable,true);assert.equal(status.verified,false);
    assert.equal(process.env.PATH,originalPath);
    const plain=spawnSync(process.execPath,[join(ROOT,'dist/cli.js'),'--project',directory,'--offline','--plain'],{cwd:ROOT,encoding:'utf8',input:'hello\n/copy\n/exit\n',timeout:15000,
      env:{...process.env,RESEARCH_PI_DATA_DIR:directory,REPI_COPY_RECORD:record,PATH:'/usr/bin:/bin',WAYLAND_DISPLAY:'repi-fixture',DISPLAY:'',SSH_CONNECTION:'',SSH_CLIENT:'',MOSH_CONNECTION:''}});
    assert.equal(plain.status,0,plain.stderr);assert.match(plain.stderr,/Copied last assistant answer/);
    assert.match(readFileSync(record,'utf8'),/ResearchPi OFFLINE TEST/);
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('Native /copy and Ctrl+X reach the installed per-user desktop clipboard helper', { skip:process.platform !== 'linux' }, () => {
  const result=spawnSync('python3',[join(ROOT,'scripts/test-clipboard-pty.py'),process.execPath],{encoding:'utf8',timeout:35000});
  assert.equal(result.status,0,result.stderr || result.error?.message);
  assert.match(result.stdout,/Native clipboard verified/);
});
