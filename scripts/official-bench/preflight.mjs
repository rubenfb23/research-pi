// Unpaid reference execution and evaluator calibration, outside every agent mount.
import {spawn} from 'node:child_process';
import {cpSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {transducerFPower} from '../official-replay-parser.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const hash=text=>createHash('sha256').update(text).digest('hex');
async function docker(image,work,extra,argv) {
 const name='repi-reference-'+randomUUID();let out='',err='';
 const args=['run','--rm','--name',name,'--network','none','--cpus','2','--memory','3g','--memory-swap','3g','--pids-limit','256','--cap-drop','ALL','--security-opt','no-new-privileges','--read-only','--tmpfs','/tmp:rw,size=512m','--tmpfs',`/home/repi:rw,uid=${process.getuid()}`,'--user',`${process.getuid()}:${process.getgid()}`,'-v',`${work}:/work`,...extra,image,...argv];
 const result=await new Promise((ok,reject)=>{
  const p=spawn('docker',args);const timer=setTimeout(()=>spawn('docker',['kill',name],{stdio:'ignore'}),600000);
  p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);
  p.on('error',e=>{clearTimeout(timer);reject(e);});p.on('close',code=>{clearTimeout(timer);ok({code,out,err});});
 });
 spawn('docker',['rm','-f',name],{stdio:'ignore'});
 if(result.code!==0)throw Error('Reference execution failed: '+result.err.slice(-1000));
 return result.out;
}
export async function verifyReferences(root,image) {
 root=resolve(root);const directory=join(root,'reference-checks',randomUUID());mkdirSync(directory,{recursive:true,mode:0o700});
 const checks=[];
 for(const id of ['capsule-8610546','capsule-8185407']) {
  const work=join(directory,id);cpSync(join(root,'inputs',id),work,{recursive:true});mkdirSync(join(work,'results'));
  let text,value;
  if(id==='capsule-8610546') {
   text=await docker(image,work,['-w','/work/code'],['python','-u','experiments.py']);
   const output=readFileSync(join(work,'results','results_model_based_robust_stabilization_experiment.txt'),'utf8');
   const m=output.match(/^optimal\s+[-+\d.]+\s+([-+\d.eE]+)/m);value=m?Number(m[1]):null;
  }else {
   const shim=join(work,'code','mwavepy');mkdirSync(shim);
   writeFileSync(join(shim,'__init__.py'),'from . import touchstone\n');
   writeFileSync(join(shim,'touchstone.py'),'import skrf\nclass touchstone:\n    def __init__(self,path):\n        self.network=skrf.Network(path)\n        self.reference=[self.network.z0[0,0].real]\n    def get_sparameter_arrays(self):\n        return self.network.f,self.network.s\n');
   text=await docker(image,work,['-w','/work/data'],['bash','-c','set -e; for script in extract eta_freq_sweep power_sweep merge_s1p calc_power; do python -u ../code/$script.py; done']);
   value=transducerFPower(text);
  }
  if(!Number.isFinite(value))throw Error('Reference result parser failed for '+id);
  writeFileSync(join(work,'reference.log'),text,{mode:0o600});
  const task=JSON.parse(readFileSync(join(root,'private',id+'.json'))),question=Object.keys(task.results[0])[0];
  for(const [kind,answer] of [['reference',value],['deliberately_wrong',value*17+999]]) {
   writeFileSync(join(work,'submission.json'),JSON.stringify({[question]:answer}));
   const score=JSON.parse((await docker(image,work,['-v',`${work}:/submission:ro`,'-v',`${join(root,'private')}:/grader:ro`,'-v',`${join(here,'core-grade.py')}:/grade.py:ro`],['python','/grade.py',id])).trim());
   if(score.all_correct!==(kind==='reference'))throw Error('Official grader calibration failed: '+id+'/'+kind);
  }
  checks.push({task:id,fullReferencePassed:true,correctAnswerAccepted:true,wrongAnswerRejected:true,logHash:hash(text)});
 }
 const vector=join(directory,'vectorization');mkdirSync(vector);cpSync(join(root,'private','baseline.py'),join(vector,'train.py'));
 const probe=JSON.parse((await docker(image,vector,['-v',`${join(here,'vector-probe.py')}:/probe.py:ro`],['python','/probe.py'])).trim());
 if(probe.outputs.length!==6||probe.seconds.length!==3||probe.seconds.some(s=>!Number.isFinite(s)||s<=0))throw Error('NumPy reference probe failed');
 checks.push({task:'vectorization',fullReferencePassed:true,correctnessCases:probe.outputs.length,timingInputs:probe.seconds.length});
 const verification={status:'passed',imageId:image,checked:new Date().toISOString(),checks};
 writeFileSync(join(directory,'verification.json'),JSON.stringify(verification,null,2));return verification;
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(await verifyReferences(process.argv[2],process.argv[3]??'repi-official-pilot:20261005'),null,2));
