import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from './paths.js';
import {pythonPath} from './experiments.js';
import {clipboardStatus} from './clipboard.js';
import {WebResearch} from './web.js';
import {selectedConfig,connectionRuntime} from './connections.js';

export async function doctor(project:string) {
 const config=selectedConfig(project);let credentialsConfigured=false;
 if(config?.provider==='researchpi-mock') credentialsConfigured=true;
 else if(config) {try {credentialsConfigured=Boolean(await (await connectionRuntime()).checkAuth(config.provider));} catch {}}
 const python=pythonPath();let experimentEnvironment:{available:boolean;versions?:unknown;detail:string}={available:false,detail:'Run repi setup --experiments to prepare pinned scientific dependencies.'};
 if(existsSync(python)) {
  const probe=spawnSync(python,['-c','import json, platform, numpy, scipy, sklearn; print(json.dumps({"python":platform.python_version(),"numpy":numpy.__version__,"scipy":scipy.__version__,"scikitLearn":sklearn.__version__}))'],{encoding:'utf8',timeout:10000,env:{PATH:process.env.PATH,SYSTEMROOT:process.env.SYSTEMROOT,OMP_NUM_THREADS:'1'}});
  if(probe.status===0) {try {
   const versions=JSON.parse(probe.stdout),lock=readFileSync(join(ROOT,'requirements.lock'),'utf8');
   const pinned=[['numpy','numpy'],['scipy','scipy'],['scikit-learn','scikitLearn']].every(([pkg,key])=>lock.split('\n').includes(pkg+'=='+versions[key!]));
   experimentEnvironment={available:pinned,versions,detail:pinned?'Imports and dependency versions checked; no experiment was executed.':'Scientific versions differ from requirements.lock.'};
  } catch {}}
 }
 const web=new WebResearch(project).status();
 return {version:JSON.parse(readFileSync(join(ROOT,'package.json'),'utf8')).version,project,
   connection:{selected:config??null,credentialsConfigured,modelAccessVerified:false,nextStep:config?'A real response is required to verify model access.':'Run repi connect to choose a provider.'},
   experiments:experimentEnvironment,web:{directReading:web.directReading,browserAvailable:web.browserAvailable,pdfReaderAvailable:web.pdfReaderAvailable,searchApiRequired:false},clipboard:clipboardStatus(),
   scope:'Prerequisite inspection only; no model request, experiment, browser navigation or clipboard read.'};
}
