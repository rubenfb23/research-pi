import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// The launcher updater deliberately has no runtime dependencies.
// @ts-ignore JavaScript entrypoint is tested without adding it to the TS build.
import {runUpdate,commitUpdate} from '../scripts/update-pi.mjs';

function fixture(native=false) {
 const root=mkdtempSync(join(tmpdir(),'repi-updater-'));
 const put=(path:string,value:unknown)=>{mkdirSync(join(root,path,'..'),{recursive:true});writeFileSync(join(root,path),JSON.stringify(value));};
 put('package.json',{version:'test',dependencies:{'@earendil-works/pi-ai':'1.0.0','@earendil-works/pi-coding-agent':'1.0.0'}});
 put('package-lock.json',{old:true});
 for(const pkg of ['pi-ai','pi-coding-agent']) put(`node_modules/@earendil-works/${pkg}/package.json`,{version:'1.0.0'});
 if(native) put('package-runtime.json',{version:'test'});
 return {root,cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
function runner(failAt='',calls:string[]=[]) {
 return (exe:string,args:string[],cwd:string)=>{
  const command=args.join(' ');calls.push(command);
  if(command.includes(failAt) && failAt) throw new Error('Injected candidate failure');
  let stdout='';
  if(args[0]==='view') stdout='"1.0.2"';
  if(args[0]==='install') {
   for(const pkg of ['pi-ai','pi-coding-agent']) {const dir=join(cwd,'node_modules','@earendil-works',pkg);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'package.json'),' {"version":"1.0.2"}');}
   writeFileSync(join(cwd,'package-lock.json'),'{"candidate":true}');
  }
  if(args[0]?.endsWith('/tsc')) {mkdirSync(join(cwd,'dist'));writeFileSync(join(cwd,'dist','cli.js'),'verified');}
  if(args.at(-1)==='resources') stdout=JSON.stringify({tools:['bash','project_status']});
  if(args.at(-1)==='[tool:project_status]') stdout=args.includes('--json') ? JSON.stringify({type:'tool_execution_end',toolName:'project_status',isError:false}) : 'Tool: project_status · done\nResearchPi OFFLINE TEST';
  return {stdout,stderr:''};
 };
}
test('Update check is read-only and checks both SDK packages',()=>{
 const f=fixture(),calls:string[]=[];
 try {runUpdate(f.root,['--check'],runner('',calls));assert.equal(calls.length,2);assert.equal(JSON.parse(readFileSync(join(f.root,'package.json'),'utf8')).dependencies['@earendil-works/pi-ai'],'1.0.0');assert(!readdirSync(f.root).some(name=>name.startsWith('.repi-')));}finally{f.cleanup();}
});
test('Candidate compilation or tool failure preserves the working SDK and releases the lock',()=>{
 for(const failAt of ['install','/tsc','[tool:project_status]']) {
  const f=fixture();try{assert.throws(()=>runUpdate(f.root,[],runner(failAt)),/Injected candidate failure/);assert.equal(JSON.parse(readFileSync(join(f.root,'node_modules/@earendil-works/pi-ai/package.json'),'utf8')).version,'1.0.0');assert(!readdirSync(f.root).some(name=>name.startsWith('.repi-')));}finally{f.cleanup();}
 }
});
test('A verified source update activates both SDK pins, lockfile and compiled code',()=>{
 const f=fixture();try{runUpdate(f.root,[],runner());assert.equal(JSON.parse(readFileSync(join(f.root,'package.json'),'utf8')).dependencies['@earendil-works/pi-ai'],'1.0.2');assert.equal(readFileSync(join(f.root,'dist/cli.js'),'utf8'),'verified');}finally{f.cleanup();}
});
test('An activation failure restores already replaced files and dependencies',()=>{
 const f=fixture(),stage=mkdtempSync(join(f.root,'candidate-'));
 try{writeFileSync(join(stage,'package.json'),'candidate');assert.throws(()=>commitUpdate(f.root,stage));assert.equal(JSON.parse(readFileSync(join(f.root,'package.json'),'utf8')).version,'test');assert(existsSync(join(f.root,'node_modules')));}finally{f.cleanup();}
});
test('Native updates activate a per-user overlay without changing the packaged app',()=>{
 const f=fixture(true),oldPointer=process.env.RESEARCH_PI_UPDATE_POINTER,oldBase=process.env.RESEARCH_PI_BASE_ROOT;
 const pointer=join(f.root,'user','active.json');process.env.RESEARCH_PI_UPDATE_POINTER=pointer;process.env.RESEARCH_PI_BASE_ROOT=f.root;
 try{runUpdate(f.root,[],runner());const active=JSON.parse(readFileSync(pointer,'utf8'));assert.equal(active.base,f.root);assert(existsSync(join(active.root,'dist/cli.js')));assert.equal(JSON.parse(readFileSync(join(f.root,'package.json'),'utf8')).dependencies['@earendil-works/pi-ai'],'1.0.0');}
 finally{if(oldPointer===undefined)delete process.env.RESEARCH_PI_UPDATE_POINTER;else process.env.RESEARCH_PI_UPDATE_POINTER=oldPointer;if(oldBase===undefined)delete process.env.RESEARCH_PI_BASE_ROOT;else process.env.RESEARCH_PI_BASE_ROOT=oldBase;f.cleanup();}
});
