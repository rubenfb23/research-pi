import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {startRelay,treeHashes} from './run.mjs';
import {mkdtempSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('relay retains provider stream, isolates credential and enforces model/request/output budgets',async()=>{
 const upstreamCalls=[];
 const upstream=createServer(async(req,res)=>{
  let body='';for await(const b of req)body+=b;
  upstreamCalls.push({authorization:req.headers.authorization,session:req.headers['x-opencode-session'],body:JSON.parse(body)});
  res.writeHead(200,{'content-type':'text/event-stream'});
  res.end('data: {"model":"test-model","usage":{"prompt_tokens":12,"completion_tokens":8}}\n\ndata: [DONE]\n\n');
 });
 await new Promise(ok=>upstream.listen(0,'127.0.0.1',ok));
 const events=[],relay=await startRelay({apiKey:'HOST-ONLY-SECRET',upstream:`http://127.0.0.1:${upstream.address().port}`,model:'test-model',maxRequests:2,maxTokens:128,events});
 const url=`http://127.0.0.1:${relay.port}/${relay.token}/v1/chat/completions`;
 try {
  let r=await fetch(url,{method:'POST',headers:{'x-opencode-session':'native-session-id'},body:JSON.stringify({model:'test-model',stream:true,max_tokens:500})});
  assert.equal(r.status,200);assert.match(await r.text(),/\[DONE\]/);
  assert.equal(upstreamCalls[0].authorization,'Bearer HOST-ONLY-SECRET');assert.equal(upstreamCalls[0].body.max_tokens,128);
  assert.equal(upstreamCalls[0].session,'native-session-id');
  assert.deepEqual(events[0].usage,{prompt_tokens:12,completion_tokens:8});assert.ok(!JSON.stringify(events).includes('HOST-ONLY-SECRET'));
  r=await fetch(url,{method:'POST',body:JSON.stringify({model:'wrong-model'})});assert.equal(r.status,502);
  r=await fetch(url,{method:'POST',body:'{}'});assert.equal(r.status,429);assert.equal(upstreamCalls.length,1);
  r=await fetch(url.replace(relay.token,'unknown'),{method:'POST',body:'{}'});assert.equal(r.status,404);
 }finally{await relay.close();upstream.closeAllConnections();await new Promise(ok=>upstream.close(ok));}
});
test('artifact hashing refuses links outside the agent workspace',{skip:process.platform==='win32'},()=>{
 const dir=mkdtempSync(join(tmpdir(),'repi-artifacts-'));
 try{writeFileSync(join(dir,'safe'),'data');assert.equal(Object.keys(treeHashes(dir)).length,1);symlinkSync('/etc/passwd',join(dir,'submission.json'));assert.throws(()=>treeHashes(dir),/Symlink/);}finally{rmSync(dir,{recursive:true,force:true});}
});
