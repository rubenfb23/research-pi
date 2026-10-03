import {join} from 'node:path';
import {readdirSync,existsSync} from 'node:fs';
import {WebResearch} from './web.js';
import {hash,readJson,writeJson} from './storage.js';
import {stateDir} from './paths.js';

export interface BibliographicReference {
 id:string; doi?:string; title:string; authors?:string[]; journal?:string; volume?:string; pages?:string; year?:number; url?:string;
}
interface RegistryRecord {doi:string;title:string;authors:{given:string;family:string}[];journal:string;volume:string;pages:string;year?:number;type:string;}
export interface ReferenceCheck {field:string;status:'matched'|'conflict'|'pending'|'not_applicable';expected:unknown;observed:unknown;}
export interface Verification {
 id:string;reference:BibliographicReference;status:'metadata_matched'|'conflict'|'pending';checkedAt:string;
 registry:string|null;record:RegistryRecord|null;checks:ReferenceCheck[];sourceIds:string[];verificationHash:string;
 scope:string;
}
export function referenceIdentity(ref:BibliographicReference):BibliographicReference {
 const keys=['id','doi','title','authors','journal','volume','pages','year','url'] as const;
 return Object.fromEntries(keys.filter(key=>ref[key]!==undefined).map(key=>[key,ref[key]])) as unknown as BibliographicReference;
}
export function normalizeDoi(value:string) {
 const raw=value.trim().replace(/^doi:\s*/i,'').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'');
 let doi:string;try {doi=decodeURIComponent(raw).toLowerCase();} catch {throw new Error('Invalid DOI encoding');}
 if(!/^10\.\d{4,9}\/[^\s?#]+$/.test(doi) || doi.length>500) throw new Error('Provide a valid DOI identifier or doi.org URL');
 return doi;
}
const text=(value:unknown)=>typeof value==='string' ? value.normalize('NFC').trim().replace(/\s+/g,' ') : '';
const names=(s:string)=>s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().match(/[\p{L}\d]+/gu)??[];
function authorCompatibility(expected:string,observed:{given:string;family:string}):'matched'|'pending'|'conflict' {
 const e=names(expected),family=names(observed.family),given=names(observed.given);
 if(!e.length || !family.length) return 'pending';
 // Full surnames must match. A surname initial alone remains unresolved.
 if(e.length<family.length+1) return 'pending';
 const ef=e.slice(-family.length);
 if(ef.some((v,i)=>v!==family[i])) return ef.every((v,i)=>v.length===1 && family[i]!.startsWith(v)) ? 'pending' : 'conflict';
 const eg=e.slice(0,-family.length);
 if(!given.length) return 'pending';
 if(eg.length>given.length) return 'conflict';
 return eg.every((v,i)=>v===given[i] || (v.length===1 && given[i]!.startsWith(v))) ? 'matched' : 'conflict';
}
function recordFrom(message:any,registry:string):RegistryRecord {
 if(registry==='Crossref') return {doi:normalizeDoi(message.DOI),title:text(message.title?.[0]),authors:(message.author??[]).map((a:any)=>({given:text(a.given),family:text(a.family)})),
   journal:text(message['container-title']?.[0]),volume:text(message.volume),pages:text(message.page??message['article-number']),
   year:(message.published??message['published-print']??message['published-online'])?.['date-parts']?.[0]?.[0],type:text(message.type)};
 const a=message.attributes;
 return {doi:normalizeDoi(a.doi),title:text(a.titles?.[0]?.title),authors:(a.creators??[]).map((c:any)=>({given:text(c.givenName),family:text(c.familyName)||text(c.name)})),
   journal:text(a.container?.title),volume:text(a.container?.volume),pages:text(a.container?.firstPage && (a.container.lastPage ? a.container.firstPage+'-'+a.container.lastPage:a.container.firstPage)),year:a.publicationYear,type:text(a.types?.resourceTypeGeneral)};
}
export function compareReference(reference:BibliographicReference,record:RegistryRecord):ReferenceCheck[] {
 const checks:ReferenceCheck[]=[];
 checks.push({field:'doi',status:normalizeDoi(reference.doi!)===record.doi ? 'matched':'conflict',expected:reference.doi,observed:record.doi});
 const expectedAuthors=reference.authors;
 const authorStates=expectedAuthors?.map((name,i)=>record.authors[i] ? authorCompatibility(name,record.authors[i]!) : 'conflict')??[];
 const authorsStatus=!expectedAuthors?.length || !record.authors.length ? 'pending' : expectedAuthors.length!==record.authors.length || authorStates.includes('conflict') ? 'conflict' : authorStates.includes('pending') ? 'pending':'matched';
 checks.push({field:'authors',status:authorsStatus,expected:expectedAuthors??null,observed:record.authors});
 for(const field of ['title','journal','volume','pages','year'] as const) {
   const expected=reference[field],observed=record[field];
   const expectedText=field==='year' ? expected===undefined ? '' : String(expected) : text(expected);
   const observedText=field==='year' ? observed===undefined ? '' : String(observed) : text(observed);
   const status=!observedText ? expectedText ? 'pending':'not_applicable' : !expectedText ? 'pending' : expectedText===observedText ? 'matched':'conflict';
   checks.push({field,status,expected:expected??null,observed:observed??null});
 }
 return checks;
}
export class ReferenceVerifier {
 constructor(private project:string,private web=new WebResearch(project)) {}
 async verify(reference:BibliographicReference,signal?:AbortSignal):Promise<Verification> {
  reference=referenceIdentity(reference);
  if(!reference || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(reference.id) || !text(reference.title)) throw new Error('Reference needs a safe ID and title');
  const sourceIds:string[]=[],checks:ReferenceCheck[]=[];let record:RegistryRecord|null=null,registry:string|null=null;
  if(!reference.doi) {
   if(reference.url) {const source=await this.web.read(reference.url,signal);sourceIds.push(source.id);}
   checks.push({field:'non_doi_identity',status:'pending',expected:reference.title,observed:'Source discovery does not establish bibliographic identity. Human source matching is required.'});
  } else {
   const doi=normalizeDoi(reference.doi),resolution=await this.web.read('https://doi.org/'+doi,signal);sourceIds.push(resolution.id);
   const redirected=new URL(resolution.url).hostname!=='doi.org' && new URL(resolution.url).hostname!=='dx.doi.org';
   const resolved=resolution.httpStatus>=200 && resolution.httpStatus<400 || redirected && [401,403,429].includes(resolution.httpStatus);
   checks.push({field:'doi_resolution',status:resolved?'matched':'pending',expected:doi,observed:{url:resolution.url,httpStatus:resolution.httpStatus,status:resolution.status}});
   for(const [name,url] of [['Crossref','https://api.crossref.org/works/'+encodeURIComponent(doi)],['DataCite','https://api.datacite.org/dois/'+encodeURIComponent(doi)]]) {
    if(signal?.aborted) break;
    const source=await this.web.read(url!,signal);sourceIds.push(source.id);
    if(source.status!=='ok' || source.nextOffset || source.truncated) continue;
    try {
     const data=JSON.parse(source.text),candidate=recordFrom(name==='Crossref' ? data.message:data.data,name!);
     if(candidate.doi!==doi) {checks.push({field:'registry_doi',status:'conflict',expected:doi,observed:candidate.doi});continue;}
     record=candidate;registry=name!;break;
    } catch {}
   }
   if(record) checks.push(...compareReference(reference,record));
   else checks.push({field:'registry_metadata',status:'pending',expected:doi,observed:'No complete supported registry metadata was retrieved; this does not prove the DOI is nonexistent.'});
  }
  const body={id:reference.id,reference,status:checks.some(c=>c.status==='conflict')?'conflict' as const:checks.some(c=>c.status==='pending')?'pending' as const:'metadata_matched' as const,
    checkedAt:new Date().toISOString(),registry,record,checks,sourceIds,
    scope:'Deposited bibliographic metadata and DOI resolution only. Initials establish name compatibility, not identity. No verification of paper claims, full-text contents, novelty, corrections or scientific validity.'};
  const report={...body,verificationHash:hash(body)};
  writeJson(join(stateDir(this.project),'references',reference.id+'.json'),report);return report;
 }
 verified(reference:BibliographicReference):Verification|undefined {
  const path=join(stateDir(this.project),'references',reference.id+'.json');if(!existsSync(path)) return;
  const report=readJson<Verification>(path),{verificationHash,...body}=report;
  if(verificationHash!==hash(body) || hash(report.reference)!==hash(referenceIdentity(reference))) return;
  if(report.sourceIds.some(id=>{try{this.web.source(id);return false;}catch{return true;}})) return;
  return report;
 }
 list() {const path=join(stateDir(this.project),'references');return existsSync(path)?readdirSync(path).filter(x=>x.endsWith('.json')).map(x=>readJson<Verification>(join(path,x))):[];}
}
