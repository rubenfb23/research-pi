import {constants,existsSync,lstatSync,mkdirSync,readFileSync,realpathSync,openSync,closeSync,writeFileSync} from 'node:fs';
import {dirname,isAbsolute,join,relative,resolve} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {Type} from '@earendil-works/pi-ai';
import {defineTool,type ToolDefinition} from '@earendil-works/pi-coding-agent';

export function workspacePath(workspace:string,path:string,writing=false):string {
 if(isAbsolute(path)||path.includes('\0')||path.split(/[\\/]/).includes('..')||path.length>160) throw new Error('Use a relative workspace file path.');
 const root=realpathSync(workspace),target=resolve(root,path),rel=relative(root,target);
 if(!rel||rel.startsWith('..')||isAbsolute(rel)) throw new Error('Path is outside the workspace.');
 if(existsSync(target) && lstatSync(target).isSymbolicLink()) throw new Error('Symlinks are not allowed.');
 let parent=dirname(target);while(!existsSync(parent)) parent=dirname(parent);
 const realParent=realpathSync(parent),scope=relative(root,realParent);
 if(scope.startsWith('..')||isAbsolute(scope)) throw new Error('Path escapes the workspace.');
 if(writing) mkdirSync(dirname(target),{recursive:true});
 return target;
}
export function readWorkspace(workspace:string,path:string):string {
 const target=workspacePath(workspace,path);
 if(!lstatSync(target).isFile()||lstatSync(target).size>256000) throw new Error('Expected a regular file no larger than 256 KB.');
 return readFileSync(target,'utf8');
}
function sandboxArgs(workspace:string,script:string,args:string[]) {
 return ['--unshare-all','--die-with-parent','--new-session','--ro-bind','/usr','/usr',...['/lib','/lib64'].filter(existsSync).flatMap(path=>['--ro-bind',path,path]),
  '--proc','/proc','--dev','/dev','--tmpfs','/tmp','--ro-bind',realpathSync(workspace),'/work','--chdir','/work','--clearenv','--setenv','PATH','/usr/bin','--cap-drop','ALL',
  '--','/usr/bin/python3','-I','-c',
  'import resource,runpy,sys;resource.setrlimit(resource.RLIMIT_CPU,(15,15));resource.setrlimit(resource.RLIMIT_AS,(536870912,536870912));resource.setrlimit(resource.RLIMIT_FSIZE,(262144,262144));resource.setrlimit(resource.RLIMIT_NPROC,(0,0));resource.setrlimit(resource.RLIMIT_NOFILE,(64,64));p=sys.argv[1];sys.argv=sys.argv[1:];runpy.run_path(p,run_name="__main__")',
  '/work/'+script,...args];
}
export function sandboxAvailable():boolean {
 if(process.platform!=='linux') return false;
 const result=spawnSync('bwrap',['--unshare-all','--die-with-parent','--ro-bind','/usr','/usr',...['/lib','/lib64'].filter(existsSync).flatMap(path=>['--ro-bind',path,path]),'--','/usr/bin/python3','-I','-c','print("ok")'],{encoding:'utf8',timeout:5000});
 return result.status===0&&result.stdout.trim()==='ok';
}
export function runSandboxedPython(workspace:string,script:string,args:string[]=[],signal?:AbortSignal):Promise<{exitCode:number|null;stdout:string;stderr:string;interrupted:boolean}> {
 workspacePath(workspace,script);if(!script.endsWith('.py')||args.length>10||args.some(a=>a.length>1000)) throw new Error('Use a workspace Python script and up to ten short arguments.');
 return new Promise((resolve,reject)=>{
  signal?.throwIfAborted();const child=spawn('bwrap',sandboxArgs(workspace,script,args),{stdio:['ignore','pipe','pipe'],detached:true,env:{PATH:'/usr/bin:/bin'}});
  let stdout='',stderr='',interrupted=false;
  const stop=()=>{interrupted=true;try{if(child.pid)process.kill(-child.pid,'SIGKILL');}catch{}};
  const timer=setTimeout(stop,20000);signal?.addEventListener('abort',stop,{once:true});
  const clean=()=>{clearTimeout(timer);signal?.removeEventListener('abort',stop);};
  child.stdout.on('data',chunk=>{stdout+=chunk;if(stdout.length>256000) stop();});child.stderr.on('data',chunk=>{stderr+=chunk;if(stderr.length>64000)stop();});
  child.once('error',error=>{clean();reject(error);});child.once('close',exitCode=>{clean();resolve({exitCode,stdout:stdout.slice(0,256000),stderr:stderr.slice(0,64000),interrupted});});
 });
}
export function workspaceTools(workspace:string,protectedFiles:Set<string>,python:boolean) {
 const tools:ToolDefinition[]=[
  defineTool({name:'read_file',label:'Read benchmark evidence',description:'Read a relative file from the isolated task workspace. No access to evaluator, credentials or other projects.',parameters:Type.Object({path:Type.String({maxLength:160})}),async execute(_id,p){return {content:[{type:'text' as const,text:readWorkspace(workspace,p.path)}],details:{}};}}),
  defineTool({name:'write_file',label:'Write benchmark artifact',description:'Write answer.json, analysis.py or other relative artifact files. Supplied evidence is immutable.',parameters:Type.Object({path:Type.String({maxLength:160}),content:Type.String({maxLength:256000})}),async execute(_id,p){const target=workspacePath(workspace,p.path,true);if(protectedFiles.has(relative(realpathSync(workspace),target).replaceAll('\\','/'))) throw new Error('Input evidence is read-only.');const fd=openSync(target,constants.O_WRONLY|constants.O_CREAT|constants.O_TRUNC|constants.O_NOFOLLOW,0o600);try{writeFileSync(fd,p.content);}finally{closeSync(fd);}return {content:[{type:'text' as const,text:'Written '+p.path}],details:{}};}}),
 ];
 if(python) tools.push(defineTool({name:'run_python',label:'Execute isolated research code',description:'Execute an EXISTING workspace .py FILE: script must be a short relative filename such as analysis.py, NEVER inline Python source. First use write_file to create the script. Installed Python standard library only. Bubblewrap sandbox: no network/host home/credentials/evaluator, workspace mounted READ-ONLY, writable /tmp, 15 CPU seconds, 512 MiB, no subprocess creation, 20 second deadline. The script must PRINT its JSON result to stdout, NOT write workspace files. Then use write_file to save that result as answer.json.',parameters:Type.Object({script:Type.String({maxLength:160})}),async execute(_id,p,signal){const result=await runSandboxedPython(workspace,p.script,[],signal);return {content:[{type:'text' as const,text:JSON.stringify(result)}],details:result};}}));
 return tools;
}
