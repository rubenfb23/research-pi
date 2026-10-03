import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ReferenceVerifier,normalizeDoi,type BibliographicReference} from '../src/references.js';
import {WebResearch} from '../src/web.js';
import {writeJson} from '../src/storage.js';
import {reviewProjectManifest} from '../src/papers.js';
const project=mkdtempSync(join(tmpdir(),'repi-reference-'));let port:number;
const record={DOI:'10.1234/fixture',title:['Evidence for research'],author:[{given:'Lorena',family:'Otero'}],'container-title':['Research Journal'],volume:'2',page:'11-20',published:{'date-parts':[[2025]]},type:'journal-article'};
const server=createServer((req,res)=>{
 if(req.url?.startsWith('/resolve')) {res.writeHead(302,{location:`http://publisher.fixture.test:${port}/article`});res.end();}
 else if(req.url?.startsWith('/article')) {res.setHeader('content-type','text/html');res.end('<title>Evidence for research</title><p>Original article fixture.</p>');}
 else if(req.url?.startsWith('/works/10.1234%2Fdatacite')) {res.writeHead(404);res.end('DataCite record');}
 else if(req.url?.startsWith('/dois/10.1234%2Fdatacite')) {res.setHeader('content-type','application/json');res.end(JSON.stringify({data:{attributes:{doi:'10.1234/datacite',titles:[{title:reference.title}],creators:[{givenName:'Lorena',familyName:'Otero'}],container:{title:reference.journal,volume:reference.volume,firstPage:'11',lastPage:'20'},publicationYear:2025,types:{resourceTypeGeneral:'JournalArticle'}}}}));}
 else if(req.url?.includes('missing')) {res.writeHead(404);res.end('Not in this registry');}
 else {res.setHeader('content-type','application/json');res.end(JSON.stringify({message:record}));}
});
before(async()=>{await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));port=(server.address() as {port:number}).port;});
after(async()=>{await new Promise<void>(r=>server.close(()=>r()));rmSync(project,{recursive:true,force:true});});
const web=()=>new WebResearch(project,{resolveTarget:async value=>{
 const original=new URL(value);let url=original;
 if(original.hostname==='doi.org') url=new URL(`http://fixture.test:${port}/resolve`);
 else if(original.hostname==='api.crossref.org' || original.hostname==='api.datacite.org') url=new URL(`http://fixture.test:${port}${original.pathname}`);
 if(!['fixture.test','publisher.fixture.test'].includes(url.hostname)) throw new Error('Fixture policy');
 return {url,address:'127.0.0.1',family:4};
}});
const reference:BibliographicReference={id:'fixture',doi:'10.1234/fixture',title:'Evidence for research',authors:['L. Otero'],journal:'Research Journal',volume:'2',pages:'11-20',year:2025,url:'https://doi.org/10.1234/fixture'};
test('Reference verification retains actual HTTP sources and compares all fields; paper accepts checked identity',async()=>{
 const verifier=new ReferenceVerifier(project,web()),report=await verifier.verify(reference);
 assert.equal(report.status,'metadata_matched');assert.equal(report.sourceIds.length,2);
 assert(report.checks.filter(c=>c.field==='authors').every(c=>c.status==='matched'));
 assert.equal(new ReferenceVerifier(project).verified(reference)?.verificationHash,report.verificationHash);
 const review=reviewProjectManifest(project,{claims:[{id:'source',text:'A source-related claim',referenceIds:['fixture']}],references:[{...reference,url:reference.url!}]});
 assert.equal(review.references[0]!.status,'verified_metadata');assert.equal(review.scientificReviewPending,true);
 assert.equal(verifier.verified({...reference,title:'Different title'}),undefined);
});
test('Wrong DOI-title/authors/volume/pages and ambiguous surname initials cannot pass',async()=>{
 const verifier=new ReferenceVerifier(project,web());
 for(const change of [{title:'Wrong title'},{authors:['L. Other']},{volume:'3'},{pages:'99-100'}]) {
  const report=await verifier.verify({...reference,...change,id:'conflict'});assert.equal(report.status,'conflict');
 }
 assert.equal((await verifier.verify({...reference,id:'ambiguous',authors:['Lorena O.']})).status,'pending');
 assert.equal((await verifier.verify({...reference,id:'partial',authors:undefined})).status,'pending');
 assert.equal(normalizeDoi('https://doi.org/10.1234/FIXTURE'),'10.1234/fixture');
 assert.throws(()=>normalizeDoi('file:///secret'),/valid DOI/);
});
test('Absent/non-DOI registry evidence stays pending; edited sources and forged statuses are rejected',async()=>{
 const verifier=new ReferenceVerifier(project,web());
 const absent=await verifier.verify({...reference,id:'missing',doi:'10.1234/missing'});assert.equal(absent.status,'pending');
 const book=await verifier.verify({id:'book',title:'Book without DOI'});assert.equal(book.status,'pending');
 const report=await verifier.verify({...reference,id:'tamper'});
 const path=join(project,'.research-pi/web/sources',report.sourceIds[0]+'.json'),source=JSON.parse(readFileSync(path,'utf8'));source.text='altered';writeJson(path,source);
 assert.equal(new ReferenceVerifier(project).verified({...reference,id:'tamper'}),undefined);
 const review=reviewProjectManifest(project,{claims:[],references:[{id:'forged',title:'Forged',url:'https://example.org',status:'verified_metadata'}]});assert.equal(review.status,'pending');
});


test('DataCite fallback verifies deposited metadata when Crossref has no record',async()=>{
 const report=await new ReferenceVerifier(project,web()).verify({...reference,id:'datacite',doi:'10.1234/datacite'});
 assert.equal(report.registry,'DataCite');assert.equal(report.status,'metadata_matched');assert.equal(report.sourceIds.length,3);
});
