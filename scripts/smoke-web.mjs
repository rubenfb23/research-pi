import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const app = process.argv[2];
const { WebResearch } = await import(pathToFileURL(join(app,'dist/web.js')).href);
const project = mkdtempSync(join(tmpdir(),'repi-installed-web-'));
let origin = '', privateHits = 0, mutations = 0;
const sockets = new Set();
const server = createServer((req,res) => {
  if (req.url === '/private') { privateHits++; res.end('private'); return; }
  if (req.url === '/mutation') { mutations++; res.end('mutation'); return; }
  if (req.url === '/metadata') { res.setHeader('content-type','application/json'); res.end('{"title":"Native fixture metadata"}'); return; }
  res.setHeader('content-type','text/html');
  res.end(`<html><title>Native fixture</title><body><main><p>Public fixture evidence.</p><a href="/metadata">Metadata</a><div id="dynamic"></div>
    <script>setTimeout(()=>document.getElementById('dynamic').textContent='Native JavaScript evidence',100);
    fetch('http://127.0.0.1:${new URL(origin).port}/private').catch(()=>{});fetch('/mutation',{method:'POST',body:'test'}).catch(()=>{});</script></main></body></html>`);
});
server.on('connection',socket => { sockets.add(socket);socket.once('close',()=>sockets.delete(socket)); });
try {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  origin = `http://fixture.researchpi.test:${server.address().port}`;
  const resolveTarget = async value => {
    const url = new URL(value);
    if (url.origin !== origin) throw new Error('Fixture rejected this destination');
    return {url,address:'127.0.0.1',family:4};
  };
  const web = new WebResearch(project,{resolveTarget});
  const direct = await web.read(origin+'/article');
  assert.equal(direct.status,'ok',JSON.stringify(direct));assert.match(direct.text,/Public fixture evidence/);
  assert.doesNotMatch(direct.text,/Native JavaScript evidence/);
  assert.equal(new WebResearch(project).source(direct.id).contentHash,direct.contentHash);
  if (web.status().browserAvailable) {
    const rendered = await web.open(origin+'/article');
    assert.equal(rendered.status,'ok',JSON.stringify(rendered));assert.match(rendered.text,/Native JavaScript evidence/);
    const follow = await web.follow(rendered.id,rendered.links[0].id);
    assert.equal(follow.status,'ok',JSON.stringify(follow));assert.equal(follow.parentSourceId,rendered.id);
    assert.match(follow.text,/Native fixture metadata/);assert.equal(privateHits,0);assert.equal(mutations,0);
    console.log('Installed runtime verified: direct web reading, real local browser, JavaScript, recorded-link following, private-target rejection and source recovery.');
  } else console.log('Installed runtime verified: direct web reading and source recovery. No supported local browser was available for rendering checks.');
} finally {
  for (const socket of sockets) socket.destroy();
  await new Promise(resolve => server.close(resolve));
  rmSync(project,{recursive:true,force:true});
}
