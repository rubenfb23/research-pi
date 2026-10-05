import {Type} from '@earendil-works/pi-ai';
import {defineTool} from '@earendil-works/pi-coding-agent';
import {hash} from './storage.js';

export function predictionMetrics(labels:number[],predictions:number[],probabilities:number[]) {
 if(!labels.length || labels.length>10000 || predictions.length!==labels.length || probabilities.length!==labels.length
   || [...labels,...predictions].some(x=>x!==0&&x!==1) || probabilities.some(x=>!Number.isFinite(x)||x<0||x>1)) throw new Error('Require equal-length binary labels/predictions and finite probabilities in [0,1].');
 const accuracy=labels.filter((label,i)=>label===predictions[i]).length/labels.length;
 const logLoss=-labels.reduce((sum,label,i)=>{const p=Math.max(1e-15,Math.min(1-1e-15,probabilities[i]!));return sum+label*Math.log(p)+(1-label)*Math.log(1-p);},0)/labels.length;
 return {accuracy,logLoss,n:labels.length,inputHash:hash({labels,predictions,probabilities}),scope:'Measured predictions only; does not establish leakage control or population validity.'};
}
export function summarizeTrainingRuns(input:{plannedSeeds:number[];methods:string[];runs:{method:string;seed:number;status:string;value:number|null}[]}) {
 if(input.plannedSeeds.length!==10 || new Set(input.plannedSeeds).size!==10 || input.plannedSeeds.some(s=>!Number.isInteger(s)||s<0||s>2**32-1)
   || !input.methods.length || input.methods.length>20 || new Set(input.methods).size!==input.methods.length || input.methods.some(m=>!m||m.length>80) || input.runs.length>1000) throw new Error('Require ten distinct training seeds and distinct named methods.');
 const expected=new Set(input.methods.flatMap(method=>input.plannedSeeds.map(seed=>`${method}:${seed}`))),seen=new Set<string>(),duplicates:string[]=[],unexpected:string[]=[];
 const completed=new Set<string>();
 for(const run of input.runs) {
  const key=`${run.method}:${run.seed}`;if(seen.has(key)) duplicates.push(key);seen.add(key);
  if(!expected.has(key)) unexpected.push(key);
  if(run.status==='completed' && Number.isFinite(run.value)) completed.add(key);
 }
 const missing=[...expected].filter(key=>!completed.has(key)).sort();
 const complete=!missing.length&&!duplicates.length&&!unexpected.length;
 const summaries=complete ? input.methods.map(method=>{const values=input.runs.filter(run=>run.method===method).map(run=>run.value!),mean=values.reduce((s,x)=>s+x,0)/values.length;return {method,n:values.length,mean,sampleSd:Math.sqrt(values.reduce((s,x)=>s+(x-mean)**2,0)/(values.length-1))};}) : [];
 return {complete,missing,duplicates:duplicates.sort(),unexpected:unexpected.sort(),summaries,inputHash:hash(input),scope:'Sample SD across training seeds on declared data/split; not a population confidence interval.'};
}
export function researchMetricTools() {
 return [
  defineTool({name:'calculate_prediction_metrics',label:'Recalculate measured classification metrics',description:'Calculate accuracy and clipped binary log loss from observed labels, predictions and class-1 probabilities. Returns an input fingerprint; no scientific validity claim.',parameters:Type.Object({labels:Type.Array(Type.Integer({minimum:0,maximum:1}),{minItems:1,maxItems:10000}),predictions:Type.Array(Type.Integer({minimum:0,maximum:1}),{maxItems:10000}),probabilities:Type.Array(Type.Number({minimum:0,maximum:1}),{maxItems:10000})}),async execute(_id,p){return {content:[{type:'text' as const,text:JSON.stringify(predictionMetrics(p.labels,p.predictions,p.probabilities))}],details:{}};}}),
  defineTool({name:'summarize_training_runs',label:'Validate and summarize ten-seed training results',description:'Check ten distinct planned seeds per method, duplicate/unexpected runs and missing completed runs. Return mean and sample SD only for complete valid coverage.',parameters:Type.Object({inputJson:Type.String({maxLength:100000})}),async execute(_id,p){return {content:[{type:'text' as const,text:JSON.stringify(summarizeTrainingRuns(JSON.parse(p.inputJson)))}],details:{}};}}),
 ];
}
