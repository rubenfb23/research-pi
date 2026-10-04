import {hash} from './storage.js';

export type ResearchTask={id:string;category:string;instruction:string;files:Record<string,string>;expected:Record<string,unknown>;requiresPython?:boolean;};
const pretty=(value:unknown)=>JSON.stringify(value,null,2)+'\n';
function generator(seed:number) {let state=seed>>>0;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/2**32;};}
export function researchTasks(split:'dev'|'validation',seed=20261004):ResearchTask[] {
 const rng=generator(seed+(split==='dev'?0:104729)),n=18+Math.floor(rng()*7),labels=Array.from({length:n},()=>Number(rng()>.5));
 const probabilities=labels.map(y=>Math.round((y ? .35+rng()*.6 : .05+rng()*.6)*100)/100),predictions=probabilities.map(p=>Number(p>=.5));
 const accuracy=labels.filter((y,i)=>y===predictions[i]).length/n;
 const logLoss=-labels.reduce((sum,y,i)=>sum+(y?Math.log(probabilities[i]!):Math.log(1-probabilities[i]!)),0)/n;
 const seeds=Array.from({length:10},(_,i)=>101+i*37+Math.floor(rng()*10)),methods=['baseline','candidate'];
 const runs=methods.flatMap(method=>seeds.map((seed,i)=>({method,seed,status:'completed',value:.6+i*.01+(method==='candidate'?.02:0)})));
 const missingSeed=seeds[Math.floor(rng()*10)]!;const incomplete=runs.filter(r=>!(r.method==='candidate'&&r.seed===missingSeed));incomplete.push({...incomplete[0]!});
 const differences=seeds.map(()=>Math.round((rng()*.1-.025)*10000)/10000),mean=differences.reduce((s,x)=>s+x,0)/10,sd=Math.sqrt(differences.reduce((s,x)=>s+(x-mean)**2,0)/9);
 const corpus={
  'sources/study-a.txt':'SYNTHETIC BENCHMARK SOURCE A. A preprocessing transformation was fitted using all observations before splitting. Accuracy was 0.94 on one random holdout. No independent replication was performed.',
  'sources/study-b.txt':'SYNTHETIC BENCHMARK SOURCE B. After preprocessing was fitted on training data only, accuracy was 0.71 on one random holdout. This experiment does not estimate performance on new hospitals.',
  'sources/study-c.txt':'SYNTHETIC BENCHMARK SOURCE C. Ten initialization seeds were evaluated on the same data and split. The reported standard deviation measures training variability, not population uncertainty.',
 };
 const train=Array.from({length:32},(_,i)=>({x:Math.round((-2+i*.13)*100)/100,y:Number(i>=16)})),test=Array.from({length:12},(_,i)=>({x:Math.round((-1.7+i*.29)*100)/100,y:Number(i>=6)}));
 const studyRuns=methods.flatMap(method=>seeds.map(seed=>{
  const draw=generator(seed),sample=method==='baseline'?train:Array.from({length:train.length},()=>train[Math.floor(draw()*train.length)]!);
  const classMean=(y:number)=>{const rows=sample.filter(r=>r.y===y);return rows.reduce((s,r)=>s+r.x,0)/rows.length;};
  const threshold=(classMean(0)+classMean(1))/2,preds=test.map(row=>Number(row.x>=threshold));
  return {method,seed,predictions:preds,accuracy:preds.filter((p,i)=>p===test[i]!.y).length/test.length};
 }));
 return [
  {id:'metrics-audit',category:'numerical_evidence',instruction:'Read predictions.json. Recalculate accuracy and binary natural-log log loss from measured predictions/probabilities. Check the reported accuracy. Write answer.json with accuracy, logLoss and reportMatches. Do not invent a population claim.',files:{'predictions.json':pretty({labels,predictions,probabilities,reportedAccuracy:Math.min(1,accuracy+.12)})},expected:{accuracy,logLoss,reportMatches:false}},
  {id:'seed-recovery',category:'failure_recovery',instruction:'Read runs.json. Each method needs ten distinct planned training seeds. Duplicate records cannot count as independent evidence. Write answer.json with complete, missing and duplicates, using method:seed strings. Preserve rather than discard the duplicate.',files:{'runs.json':pretty({plannedSeeds:seeds,methods,runs:incomplete})},expected:{complete:false,missing:[`candidate:${missingSeed}`],duplicates:[`baseline:${seeds[0]}`]}},
  {id:'split-leakage',category:'experimental_design',instruction:'Read design.json. Identify the actual leakage mechanisms. Write answer.json with subjectOverlap, preprocessingLeakage, futureFeatureLeakage, testSelectionLeakage and supportedDeploymentClaim (booleans). Do not equate successful code execution with valid evaluation.',files:{'design.json':pretty({trainSubjects:['p1','p2','p3'],testSubjects:['p3','p4'],preprocessing:'Fit normalization on concatenated train and test before splitting',features:['age','post_outcome_discharge_decision'],predictionTime:'admission',selection:'Select hyperparameters with highest test accuracy',claim:'Generalizes to independent hospitals'})},expected:{subjectOverlap:true,preprocessingLeakage:true,futureFeatureLeakage:true,testSelectionLeakage:true,supportedDeploymentClaim:false}},
  {id:'paired-uncertainty',category:'statistical_interpretation',instruction:'Read comparison.json. Compute mean and sample SD (ddof=1) of paired candidate-minus-baseline differences. Write answer.json with meanDifference, sampleSd, n and populationUncertaintyEstablished. Repeated initialization on one dataset/split does not establish population uncertainty.',files:{'comparison.json':pretty({differences,variation:'training initialization only',datasetCount:1,splitCount:1})},expected:{meanDifference:mean,sampleSd:sd,n:10,populationUncertaintyEstablished:false}},
  {id:'causal-claim',category:'causal_reasoning',instruction:'Read causal.json. Write answer.json with canClaimCausalEffect, identificationProven and requiredNextStep. The allowed next step labels are identification_or_design, fit_more_seeds, accept_correlation. Distinguish stated identification from justified identification.',files:{'causal.json':pretty({treatment:'treatment uptake',outcome:'recovery',assignment:'patient self-selection',data:'observational',unmeasuredConfounder:'disease severity',plan:{identification:'identified',justification:'The correlation is statistically significant'}})},expected:{canClaimCausalEffect:false,identificationProven:false,requiredNextStep:'identification_or_design'}},
  {id:'source-synthesis',category:'literature_support',instruction:'Read all three files under sources/. They are synthetic passages, not real papers. Write answer.json with preprocessingInflatedEvidence, newHospitalGeneralizationSupported, populationIntervalSupported (booleans), and citations: an array of exactly three objects {source,quote}, one per file, using a verbatim supporting sentence of at least 35 characters. Verify statements against the passages instead of relying on a DOI or fluent prose.',files:corpus,expected:{preprocessingInflatedEvidence:true,newHospitalGeneralizationSupported:false,populationIntervalSupported:false}},
  {id:'replicate-study',category:'executed_replication',requiresPython:true,instruction:'Read study.json. Implement analysis.py and execute it with run_python. For each planned seed, baseline uses all training rows, candidate samples len(train) training rows with replacement using the specified LCG. Threshold is the midpoint of class-0 and class-1 sample means; classify test x >= threshold as 1. For every method/seed report predictions and accuracy. LCG: state=(1664525*state+1013904223) mod 2^32; draw=state/2^32; index=floor(draw*len(train)). Reset state to the seed for each run. Baseline is deterministic; ten repetitions here test explicit coverage, not statistical necessity. Write answer.json as {runs:[{method,seed,predictions,accuracy},...],populationGeneralizationEstablished:false}. The script must reproduce that same JSON on stdout in a fresh execution. Preserve every planned run. A miniature synthetic replication, not a discovery task.',files:{'study.json':pretty({train,test,methods,seeds})},expected:{runs:studyRuns,populationGeneralizationEstablished:false}},
 ];
}
export interface ResearchGrade {passed:boolean;score:number;checks:{name:string;passed:boolean}[];}
function match(actual:unknown,expected:unknown):boolean {
 if(typeof expected==='number') return typeof actual==='number'&&Number.isFinite(actual)&&Math.abs(actual-expected)<=1e-8;
 if(Array.isArray(expected)) return Array.isArray(actual)&&actual.length===expected.length&&expected.every((value,i)=>match(actual[i],value));
 if(expected && typeof expected==='object') return !!actual&&typeof actual==='object'&&Object.entries(expected).every(([key,value])=>match((actual as Record<string,unknown>)[key],value));
 return actual===expected;
}
export function gradeResearch(task:ResearchTask,answer:unknown,execution?:{executed:boolean;replayed:boolean;replayAnswer:unknown}):ResearchGrade {
 const obj=answer&&typeof answer==='object'&&!Array.isArray(answer)?answer as Record<string,unknown>:{};
 const checks=Object.entries(task.expected).map(([name,expected])=>({name,passed:match(obj[name],expected)}));
 if(task.id==='source-synthesis') {
  const citations=Array.isArray(obj.citations)?obj.citations as {source:string;quote:string}[]:[];
  checks.push({name:'passage_grounding',passed:citations.length===3&&new Set(citations.map(c=>c?.source)).size===3&&citations.every(c=>typeof c?.quote==='string'&&c.quote.length>=35&&!!task.files[c.source]?.includes(c.quote))});
 }
 if(task.requiresPython) {
  // Order is not a scientific requirement: normalize the method/seed run grid.
  const order=(runs:unknown)=>Array.isArray(runs)?[...runs].sort((a,b)=>`${a?.method}:${a?.seed}`.localeCompare(`${b?.method}:${b?.seed}`)):runs;
  const runCheck=checks.find(c=>c.name==='runs')!;runCheck.passed=match(order(obj.runs),order(task.expected.runs));
  checks.push({name:'actual_execution',passed:execution?.executed===true},{name:'fresh_reproduction',passed:execution?.replayed===true&&match(order((execution.replayAnswer as any)?.runs),order(task.expected.runs))&&match((execution.replayAnswer as any)?.populationGeneralizationEstablished,false)});
 }
 return {passed:checks.every(c=>c.passed),score:checks.filter(c=>c.passed).length/checks.length,checks};
}
export const researchTaskFingerprint=(task:ResearchTask)=>hash(task);
