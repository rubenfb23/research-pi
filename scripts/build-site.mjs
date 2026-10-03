import {cpSync,mkdirSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
rmSync('build/site',{recursive:true,force:true});mkdirSync('build/site',{recursive:true});
cpSync('site','build/site',{recursive:true});cpSync('assets','build/site/assets',{recursive:true});
const evidence=JSON.parse(readFileSync('assets/capture-manifest.json','utf8'));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cards=evidence.rows.map(row=>`<article><h3>${esc(row.methodId)}</h3><p>Accuracy: ${row.metrics.accuracy.mean.toFixed(6)} ± ${row.metrics.accuracy.sampleSd.toFixed(6)}</p><p>Log loss: ${row.metrics.log_loss.mean.toFixed(6)} ± ${row.metrics.log_loss.sampleSd.toFixed(6)}</p><small>${row.metrics.accuracy.n} training seeds · mean ± sample SD</small></article>`).join('');
writeFileSync('build/site/index.html',readFileSync('site/index.html','utf8').replace('<!-- MEASURED_MOBILE_RESULTS -->',cards));
console.log('Static documentation site built with recorded product evidence.');
