import {lstatSync,readdirSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {hash,readJson} from './storage.js';
import {scoreResearchIndex,type IndexProtocol,type IndexEvidence} from './research-index.js';
export function requestEvidenceMatches(requests:unknown[],digest:string) {
 if(hash(requests)===digest)return {matched:true,legacyOptionalSettings:false};
 const restored=requests.map(item=>{const r=item as Record<string,unknown>;if(!r.settings||typeof r.settings!=='object')return r;const settings={...r.settings as Record<string,unknown>};for(const key of ['max_tokens','max_completion_tokens','temperature','reasoning_effort','stream'])if(!(key in settings))settings[key]=null;return {...r,settings};});
 return {matched:hash(restored)===digest,legacyOptionalSettings:hash(restored)===digest};
}
function artifacts(root:string,prefix='',budget={bytes:0}):Record<string,string> {
 const files:Record<string,string>={};
 for(const name of readdirSync(root).sort()) {
  const path=join(root,name),key=prefix+name,stat=lstatSync(path);
  if(stat.isSymbolicLink())throw Error('Artifact symlink: '+key);
  if(stat.isDirectory())Object.assign(files,artifacts(path,key+'/',budget));
  else if(stat.isFile()) {budget.bytes+=stat.size;if(budget.bytes>512*1024*1024)throw Error('Artifact byte budget exceeded.');files[key]=createHash('sha256').update(readFileSync(path)).digest('hex');}
  else throw Error('Special artifact file: '+key);
 }
 return files;
}
export function auditIndexRun(directory:string) {
 const root=resolve(directory),errors:string[]=[];let checked=0,legacyOptionalSettingsDigests=0;
 try {
  const protocol=readJson<IndexProtocol>(join(root,'protocol.json')),evidence=readJson<IndexEvidence[]>(join(root,'evidence.json'));
  const result=scoreResearchIndex(protocol,evidence);
  const receipts=new Map<string,{path:string;value:any}>();
  for(const entry of readdirSync(root,{withFileTypes:true})) {
   if(entry.isSymbolicLink())throw Error('Symlink in run directory.');
   if(!entry.isDirectory())continue;
   const path=join(root,entry.name);let receipt:any;
   try{if(lstatSync(join(path,'receipt.json')).isSymbolicLink())throw Error('Receipt symlink.');receipt=readJson(join(path,'receipt.json'));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')continue;throw e;}
   const key=JSON.stringify([receipt.taskId,receipt.conditionId,receipt.trial]);
   if(receipts.has(key))throw Error('Duplicate receipt identity.');receipts.set(key,{path,value:receipt});
  }
  for(const e of evidence) {
   const key=JSON.stringify([e.taskId,e.conditionId,e.trial]),receipt=receipts.get(key);if(!receipt){errors.push('Missing receipt: '+key);continue;}
   checked++;
   if(hash(receipt.value)!==e.receiptHash||receipt.value.protocolHash!==protocol.protocolHash)errors.push('Receipt digest/protocol mismatch: '+key);
   if(hash(receipt.value.grade.criteria)!==hash(e.criteria)||receipt.value.grade.valid!==e.valid)errors.push('Receipt grading mismatch: '+key);
   const files=artifacts(join(receipt.path,'work'));
   if(hash(files)!==e.artifactHash||hash(files)!==hash(receipt.value.artifactHashes))errors.push('Artifact digest mismatch: '+key);
   const requests=readJson<any[]>(join(receipt.path,'requests.json'));
   const requestCheck=requestEvidenceMatches(requests,receipt.value.requestHash);if(!requestCheck.matched)errors.push('Request evidence mismatch: '+key);if(requestCheck.legacyOptionalSettings)legacyOptionalSettingsDigests++;
   if(requests.some(r=>r.returnedModel&&r.returnedModel!==protocol.conditions.find(c=>c.id===e.conditionId)?.model))errors.push('Returned model identity mismatch: '+key);
   const traceHash=createHash('sha256').update(readFileSync(join(receipt.path,'native-trace.jsonl'))).digest('hex');
   if(traceHash!==receipt.value.traceHash)errors.push('Native trace mismatch: '+key);
  }
  if(receipts.size!==evidence.length)errors.push('Receipt/evidence attempt count mismatch.');
  if(hash(readJson(join(root,'index.json')))!==hash(result))errors.push('Computed index differs from saved result.');
  return {status:errors.length?'invalid':result.missingAttempts||result.missingDomains.length?'incomplete':'verified',checked,errors,legacyOptionalSettingsDigests,serializationNote:'Legacy native settings included undefined values normalized as null by the digest, then omitted by JSON. Only the five known optional wire-setting keys may be reconstructed; changed values still fail.',protocolHash:protocol.protocolHash,evidenceHash:result.evidenceHash,scope:'Checks local receipt, grading, model identity and file consistency. Does not authenticate scientific reviewers or certify scientific validity.'};
 }catch(e){return {status:'invalid',checked,errors:[...errors,(e as Error).message],scope:'No scientific certification.'};}
}
