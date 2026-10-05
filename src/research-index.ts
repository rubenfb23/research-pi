import {hash} from './storage.js';

export const indexDomains = ['reproduction','experimentation','statistics_causality','literature','scientific_writing'] as const;
export type IndexDomain = typeof indexDomains[number];
export interface IndexCondition {id:string;harness:string;revision:string;model:string;provider:string;settings:Record<string,unknown>;}
export interface IndexTask {id:string;domain:IndexDomain;family:string;inputHash:string;criteria:string[];requiresExpertReview:boolean;}
export interface IndexProtocol {
 schemaVersion:1;version:string;phase:'development'|'holdout';reference:string;conditions:IndexCondition[];tasks:IndexTask[];trials:number;
 budgets:{seconds:number;requests:number;outputTokens:number};domainWeights:Record<IndexDomain,number>;
 rating:{regularization:number;tieTolerance:number;bootstrapSamples:number;bootstrapSeed:number};
 disclosure:string;protocolHash:string;
}
export interface IndexEvidence {
 taskId:string;conditionId:string;trial:number;status:'completed'|'failed'|'timeout';valid:boolean;
 criteria:Record<string,number>;receiptHash:string;artifactHash:string;
 review:{kind:'automated'|'independent_expert';reviewerId?:string;blinded?:boolean;notes:string};
 seconds?:number;costUsd?:number;
}
const shaPattern=/^[a-f0-9]{64}$/;
const fail=(message:string):never=>{throw new Error(message);};
const finite=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const distinct=(values:string[])=>values.length>0&&values.every(v=>typeof v==='string'&&v.length>0&&v.length<=200)&&new Set(values).size===values.length;
export function freezeIndexProtocol(input:Omit<IndexProtocol,'protocolHash'>):IndexProtocol {
 if(input.schemaVersion!==1||!['development','holdout'].includes(input.phase)||!input.version||!input.disclosure)fail('Invalid index version, phase or disclosure.');
 if(!distinct(input.conditions.map(c=>c.id))||input.conditions.length<2||!input.conditions.some(c=>c.id===input.reference))fail('Choose distinct configurations and an existing fixed reference.');
 for(const c of input.conditions)if(!c.harness||!c.revision||!c.model||!c.provider||!c.settings||typeof c.settings!=='object'||Array.isArray(c.settings))fail('Record full configuration identity and settings.');
 if(!distinct(input.tasks.map(t=>t.id)))fail('Task IDs must be distinct.');
 for(const t of input.tasks)if(!indexDomains.includes(t.domain)||!t.family||!shaPattern.test(t.inputHash)||!distinct(t.criteria)||typeof t.requiresExpertReview!=='boolean')fail('Invalid task domain, input hash, rubric or review policy.');
 if(!Number.isInteger(input.trials)||!finite(input.trials,1,100))fail('Use 1–100 planned independent agent attempts.');
 for(const [key,max] of [['seconds',3600],['requests',200],['outputTokens',32768]] as const)if(!Number.isInteger(input.budgets[key])||!finite(input.budgets[key],1,max))fail('Invalid frozen resource budget.');
 if(Object.keys(input.domainWeights).length!==5||indexDomains.some(d=>!finite(input.domainWeights[d],0.001,1))||Math.abs(indexDomains.reduce((s,d)=>s+input.domainWeights[d],0)-1)>1e-9)fail('Declare positive weights for all five domains totaling one.');
 const r=input.rating;if(!finite(r.regularization,.001,100)||!finite(r.tieTolerance,0,.1)||!Number.isInteger(r.bootstrapSamples)||!finite(r.bootstrapSamples,100,5000)||!Number.isInteger(r.bootstrapSeed)||!finite(r.bootstrapSeed,0,2**32-1))fail('Invalid prespecified rating parameters.');
 return {...input,protocolHash:hash(input)};
}
export function verifyIndexProtocol(protocol:IndexProtocol) {
 const {protocolHash,...input}=protocol;
 if(freezeIndexProtocol(input).protocolHash!==protocolHash)fail('Index protocol hash mismatch.');
 return protocol;
}
const key=(task:string,condition:string,trial:number)=>JSON.stringify([task,condition,trial]);
function validateEvidence(p:IndexProtocol,evidence:IndexEvidence[]) {
 const seen=new Set<string>();
 for(const e of evidence) {
  const t=p.tasks.find(t=>t.id===e.taskId);
  if(!t||!p.conditions.some(c=>c.id===e.conditionId)||!Number.isInteger(e.trial)||e.trial<1||e.trial>p.trials)fail('Evidence is outside the frozen schedule.');
  if(!t)throw new Error('Unknown task.');
  const id=key(e.taskId,e.conditionId,e.trial);if(seen.has(id))fail('Duplicate attempt evidence.');seen.add(id);
  if(!['completed','failed','timeout'].includes(e.status)||typeof e.valid!=='boolean'||!shaPattern.test(e.receiptHash)||!shaPattern.test(e.artifactHash))fail('Invalid evidence status or provenance.');
  if(Object.keys(e.criteria).some(c=>!t.criteria.includes(c))||t.criteria.some(c=>!finite(e.criteria[c],0,1)))fail('Supply every frozen criterion as a finite score in [0,1].');
  if(!e.review||!['automated','independent_expert'].includes(e.review.kind)||typeof e.review.notes!=='string')fail('Record the assessment method.');
  if(e.review.kind==='independent_expert'&&(!e.review.reviewerId||e.review.blinded!==true))fail('Expert review needs an identity and a blinded-review attestation.');
  if(e.seconds!==undefined&&!finite(e.seconds,0,1e9)||e.costUsd!==undefined&&!finite(e.costUsd,0,1e9))fail('Missing telemetry is unavailable, never zero or negative.');
 }
}
const quality=(e:IndexEvidence,t:IndexTask)=>e.status==='completed'&&e.valid?t.criteria.reduce((s,c)=>s+e.criteria[c]!,0)/t.criteria.length:0;
const sigmoid=(x:number)=>x>=0?1/(1+Math.exp(-x)):Math.exp(x)/(1+Math.exp(x));
interface Match {a:number;b:number;outcome:number;weight:number;domain:IndexDomain;family:string;}
function fit(n:number,anchor:number,matches:Match[],lambda:number):number[] {
 const strengths=Array<number>(n).fill(0);
 for(let iteration=0;iteration<2000;iteration++) {
  let movement=0;
  for(let i=0;i<n;i++) {
   if(i===anchor)continue;
   let gradient=lambda*strengths[i]!,curvature=lambda;
   for(const m of matches)if(m.a===i||m.b===i) {
    const prob=sigmoid(strengths[m.a]!-strengths[m.b]!);const sign=m.a===i?1:-1;
    gradient+=m.weight*(prob-m.outcome)*sign;curvature+=m.weight*prob*(1-prob);
   }
   const delta=Math.max(-2,Math.min(2,gradient/curvature));strengths[i]=strengths[i]!-delta;movement=Math.max(movement,Math.abs(delta));
  }
  if(movement<1e-9)return strengths;
 }
 return fail('Rating optimizer did not converge.');
}
const quantile=(values:number[],fraction:number)=>{const a=[...values].sort((a,b)=>a-b);return a[Math.floor((a.length-1)*fraction)]!;};
export function scoreResearchIndex(protocol:IndexProtocol,evidence:IndexEvidence[]) {
 const p=verifyIndexProtocol(protocol);validateEvidence(p,evidence);
 const evidenceMap=new Map(evidence.map(e=>[key(e.taskId,e.conditionId,e.trial),e]));
 const missingDomains=indexDomains.filter(d=>!p.tasks.some(t=>t.domain===d));
 const expected=p.tasks.length*p.trials*p.conditions.length;
 const missingAttempts=expected-evidence.length;
 const pendingReviews=evidence.filter(e=>p.tasks.find(t=>t.id===e.taskId)!.requiresExpertReview&&e.review.kind!=='independent_expert').length;
 const complete=missingDomains.length===0&&missingAttempts===0;
 const publishable=complete&&p.phase==='holdout'&&pendingReviews===0;
 const matches:Match[]=[];
 // Repeats do not increase the total evidential weight of a task family.
 const totalFamilies=new Set(p.tasks.map(t=>JSON.stringify([t.domain,t.family]))).size;
 for(const t of p.tasks) {
  const families=new Set(p.tasks.filter(x=>x.domain===t.domain).map(x=>x.family)).size;
  const within=p.tasks.filter(x=>x.domain===t.domain&&x.family===t.family).length;
  const weight=p.domainWeights[t.domain]*totalFamilies/(families*within*p.trials);
  for(let trial=1;trial<=p.trials;trial++)for(let a=0;a<p.conditions.length;a++)for(let b=a+1;b<p.conditions.length;b++) {
   const left=evidenceMap.get(key(t.id,p.conditions[a]!.id,trial)),right=evidenceMap.get(key(t.id,p.conditions[b]!.id,trial));
   if(!left||!right)continue;
   const delta=quality(left,t)-quality(right,t);
   matches.push({a,b,outcome:Math.abs(delta)<=p.rating.tieTolerance?.5:delta>0?1:0,weight,domain:t.domain,family:t.family});
  }
 }
 const anchor=p.conditions.findIndex(c=>c.id===p.reference);
 const strengths=complete?fit(p.conditions.length,anchor,matches,p.rating.regularization):null;
 const intervals:number[][]|null=complete&&p.trials>=2&&indexDomains.every(d=>new Set(p.tasks.filter(t=>t.domain===d).map(t=>t.family)).size>=3)?p.conditions.map(()=>[]):null;
 if(intervals) {
  let seed=p.rating.bootstrapSeed;
  const draw=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  for(let sample=0;sample<p.rating.bootstrapSamples;sample++) {
   const sampled:Match[]=[];
   for(const d of indexDomains) {
    const families=[...new Set(p.tasks.filter(t=>t.domain===d).map(t=>t.family))];
    for(let k=0;k<families.length;k++){const family=families[Math.floor(draw()*families.length)]!;sampled.push(...matches.filter(m=>m.domain===d&&m.family===family));}
   }
   fit(p.conditions.length,anchor,sampled,p.rating.regularization).forEach((s,i)=>intervals[i]!.push(100*sigmoid(s)));
  }
 }
 const rows=p.conditions.map((c,i)=>{
  const domains=Object.fromEntries(indexDomains.map(d=>{
   const families=[...new Set(p.tasks.filter(t=>t.domain===d).map(t=>t.family))];
   const familyScores=families.map(f=>{
    const tasks=p.tasks.filter(t=>t.domain===d&&t.family===f);
    return tasks.reduce((sum,t)=>sum+Array.from({length:p.trials},(_,trial)=>{const e=evidenceMap.get(key(t.id,c.id,trial+1));return e?quality(e,t):0;}).reduce((a,b)=>a+b,0)/p.trials,0)/tasks.length;
   });
   return [d,families.length?familyScores.reduce((a,b)=>a+b,0)/families.length*100:null];
  })) as Record<IndexDomain,number|null>;
  const own=evidence.filter(e=>e.conditionId===c.id);
  const rating=strengths?100*sigmoid(strengths[i]!):null;
  return {...c,rai:publishable?rating:null,developmentRating:complete&&p.phase==='development'?rating:null,
   interval95:intervals?[quantile(intervals[i]!,.025),quantile(intervals[i]!,.975)]:null,domains,
   scientificQuality:missingDomains.length===0?indexDomains.reduce((s,d)=>s+p.domainWeights[d]!*domains[d]!,0):null,
   attempted:own.length,planned:p.tasks.length*p.trials,validCompleted:own.filter(e=>e.valid&&e.status==='completed').length,
   seconds:own.length&&own.every(e=>e.seconds!==undefined)?own.reduce((s,e)=>s+e.seconds!,0):null,
   costUsd:own.length&&own.every(e=>e.costUsd!==undefined)?own.reduce((s,e)=>s+e.costUsd!,0):null};
 });
 const scoreField=publishable?'rai':p.phase==='development'?'developmentRating':'rai';
 const leader=complete&&(publishable||p.phase==='development')?Math.max(...rows.map(r=>r[scoreField]??0)):null;
 const ordered=rows.sort((a,b)=>(b[scoreField]??0)-(a[scoreField]??0));
 const lift=p.conditions.flatMap(a=>p.conditions.filter(b=>a.id<b.id&&a.model===b.model&&a.provider===b.provider&&hash(a.settings)===hash(b.settings)&&a.harness!==b.harness).map(b=>{
  const left=rows.find(r=>r.id===a.id)!,right=rows.find(r=>r.id===b.id)!;
  return {left:a.id,right:b.id,deltaQualityPoints:complete?left.scientificQuality!-right.scientificQuality!:null,inference:'Descriptive paired comparison; no superiority claim or independent human-level certification.'};
 }));
 return {schemaVersion:1,version:p.version,phase:p.phase,protocolHash:p.protocolHash,evidenceHash:hash(evidence),reference:p.reference,
  status:!complete?'incomplete':publishable?'scored_holdout':p.phase==='development'?'development_only':'awaiting_expert_reviews',
  publishable,missingDomains,missingAttempts,pendingReviews,matches:matches.length,
  uncertainty:intervals?'Exploratory stratified task-family bootstrap; pairing and repeats retained.':'Unavailable: require at least three independent families per domain and two attempts per condition. No claim of significant ordering.',
  ratingScope:'Regularized Bradley–Terry relative strength; fixed reference 50; ties encoded as half-wins. A display transform does not remove saturation. Not percent PhD competence.',
  reviewScope:'Expert identity and blinding are submitter attestations, not automatically verified credentials. Review quality and independence require external audit.',
  rows:ordered.map(r=>({...r,gapToLeader:leader===null?null:leader-(r[scoreField]??0)})),sameModelHarnessLift:lift,
  saturated:matches.length>0&&matches.every(m=>m.outcome===.5),evidence};
}
const escape=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const display=(n:number|null)=>n===null?'Pending':n>99.95?'<100':n.toFixed(1);
export function renderIndexReport(result:ReturnType<typeof scoreResearchIndex>) {
 const domainNames=indexDomains.map(d=>`<th>${escape(d.replaceAll('_',' '))}</th>`).join('');
 const rows=result.rows.map(r=>`<tr><td><strong>${escape(r.id)}</strong><br><small>${escape(r.harness)} · ${escape(r.model)}</small></td><td>${escape(display(r.rai??r.developmentRating))}</td><td>${escape(r.gapToLeader===null?'Pending':r.gapToLeader.toFixed(1))}</td>${indexDomains.map(d=>`<td>${escape(r.domains[d]===null?'Pending':r.domains[d]!.toFixed(1))}</td>`).join('')}<td>${r.validCompleted}/${r.planned}</td></tr>`).join('');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Research Agent Index</title><style>body{margin:0;background:#0b1220;color:#e4ebf5;font:16px/1.65 system-ui}main{max-width:1250px;margin:auto;padding:36px 24px}h1{font-size:clamp(30px,5vw,54px);line-height:1.1}h1,h2{color:#bceede}a{color:#91d8ff}.card{padding:24px;margin:22px 0;background:#142033;border:1px solid #2d405b;border-radius:16px}.badge{color:#ffe1a3;font-weight:bold}.scroll{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:13px;border-bottom:1px solid #2d405b;text-align:left;vertical-align:top}small{color:#acbdd2}.notice{border-left:4px solid #ffc66d;padding-left:18px}code{overflow-wrap:anywhere}details{margin:14px 0}pre{white-space:pre-wrap}</style></head><body><main><p>RESEARCHPI · SCIENTIFIC EVALUATION</p><h1>Research Agent Index</h1><p class="badge">${escape(result.version)} · ${escape(result.status.replaceAll('_',' '))}</p><p class="notice">${result.publishable?'Holdout ratings require external review audit before scientific claims.':'Development calibration only. No validated research ranking or harness superiority has been established.'}</p><div class="card"><h2>A fixed reference, transparent evidence</h2><p>Reference: <strong>${escape(result.reference)}</strong> = 50. A finite relative rating approaches 100. It is not accuracy or percentage PhD capability. Scientific domain scores below are criterion percentages; they can reach 100.</p><p>${escape(result.uncertainty)}</p>${result.saturated?'<p class="notice">All scored comparisons tie: this evaluation is saturated. The scale cannot manufacture a winner.</p>':''}</div><div class="card scroll"><table><thead><tr><th>Configuration</th><th>${result.publishable?'RAI':'Development rating'}</th><th>Gap to observed leader</th>${domainNames}<th>Valid completed</th></tr></thead><tbody>${rows}</tbody></table></div><div class="card"><h2>Coverage and assessment</h2><p>Missing attempts: ${result.missingAttempts}. Missing domains: ${escape(result.missingDomains.join(', ')||'none')}. Pending independent expert reviews: ${result.pendingReviews}.</p><p>${escape(result.reviewScope)}</p><p>Costs, times and complete evidence are retained in the JSON export. One fitted rating can hide domain trade-offs. These development tasks are public and cannot establish generalization to a sealed test.</p></div><div class="card"><h2>Evidence receipts</h2>${result.evidence.map(e=>`<details><summary>${escape(e.taskId)} · ${escape(e.conditionId)} · attempt ${e.trial} · ${escape(e.status)}</summary><p>Scientific validity gate: ${e.valid}. Assessment: ${escape(e.review.kind)}.</p><p>${escape(e.review.notes)}</p><pre>${escape(JSON.stringify(e.criteria,null,2))}</pre><small>Receipt ${escape(e.receiptHash)}<br>Artifacts ${escape(e.artifactHash)}</small></details>`).join('')}</div><small>Protocol ${escape(result.protocolHash)}<br>Evidence ${escape(result.evidenceHash)}</small></main></body></html>`;
}
