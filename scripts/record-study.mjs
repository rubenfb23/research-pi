// Record actual CLI progress and a compact view of measured aggregation.
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),project=resolve(process.argv[2]??'examples/recorded-study');
const assets=join(root,'assets');mkdirSync(assets,{recursive:true});
const start=Date.now(),events=[];
const emit=text=>{events.push([(Date.now()-start)/1000,'o',text]);process.stdout.write(text);};
emit('$ repi --project ./wisconsin-study demo --dataset breast-cancer\r\n');
const child=spawn(process.execPath,[join(root,'dist/cli.js'),'--project',project,'demo','--dataset','breast-cancer'],{cwd:root,stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>emit(String(data).replace(/\n/g,'\r\n')));
await new Promise((accept,reject)=>{child.once('error',reject);child.once('close',code=>code===0?accept():reject(new Error('Study failed: '+code)));});
const aggregate=JSON.parse(readFileSync(join(project,'.research-pi/aggregate.json'),'utf8')),audit=JSON.parse(readFileSync(join(project,'.research-pi/audit.json'),'utf8')),frozen=JSON.parse(readFileSync(join(project,'.research-pi/protocol.json'),'utf8'));
if(audit.status!=='complete'||aggregate.rows.length!==2||aggregate.rows.some(r=>r.metrics.accuracy.n!==10)) throw Error('Incomplete actual evidence');
emit('\r\nAudit: complete · 20 measured runs · 10 seeds per configuration\r\n');
for(const row of aggregate.rows) emit(`${row.methodId.padEnd(16)} accuracy ${row.metrics.accuracy.mean.toFixed(6)} ± ${row.metrics.accuracy.sampleSd.toFixed(6)} (sample SD)\r\n`);
emit('Evidence: protocol.json · runs/ · artifacts/ · results.csv · aggregate.json\r\n');
emit('Scope: training variation on one fixed split; no clinical or superiority claim.\r\n');
writeFileSync(join(assets,'study.cast'),[{version:2,width:110,height:30,title:'ResearchPi actual twenty-fit real-data study',idle_time_limit:1},...events].map(e=>JSON.stringify(e)).join('\n')+'\n');
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const texts=[['569 observations · 30 features · fixed stratified holdout',132,'#425e75',22],['Configuration',205,'#5a6f80',16],['Accuracy: mean ± sample SD',205,'#5a6f80',16,450],['Log loss: mean ± sample SD',205,'#5a6f80',16,835]];
aggregate.rows.forEach((row,i)=>{
 const y=261+i*71;texts.push([row.methodId,y,'#102338',22],[`${row.metrics.accuracy.mean.toFixed(6)} ± ${row.metrics.accuracy.sampleSd.toFixed(6)}`,y,'#102338',22,450],[`${row.metrics.log_loss.mean.toFixed(6)} ± ${row.metrics.log_loss.sampleSd.toFixed(6)}`,y,'#102338',22,835]);
});
texts.push(['20 measured runs',397,'#102338',22],['10 distinct seeds / configuration',437,'#425e75',18],['Protocol → Receipts → Predictions → Recalculated table',486,'#425e75',18],['One fixed dataset and split. No clinical validation or general superiority claim.',554,'#5a6f80',16]);
writeFileSync(join(assets,'study.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="600" viewBox="0 0 1280 600" role="img" aria-labelledby="title desc"><title id="title">Measured ResearchPi classification study</title><desc id="desc">Actual twenty-run Wisconsin dataset experiment. Ten training seeds per configuration; values are mean and sample standard deviation on one fixed split.</desc><rect width="1280" height="600" rx="20" fill="#f4f8fb"/><rect x="37" y="30" width="198" height="30" rx="15" fill="#d7f4e9"/><g font-family="Arial,Helvetica,sans-serif"><text x="56" y="51" font-size="13" font-weight="700" fill="#23634d">ACTUAL MEASUREMENTS</text><text x="42" y="99" font-size="34" font-weight="700" fill="#102338">A complete, traceable classification study</text><path d="M42 222H1220M42 298H1220M42 367H1220" stroke="#d5e1ea"/>${texts.map(([text,y,color,size,x])=>`<text x="${x??42}" y="${y}" fill="${color}" font-size="${size}">${esc(text)}</text>`).join('')}</g></svg>\n`);
writeFileSync(join(assets,'capture-manifest.json'),JSON.stringify({capturedAt:new Date().toISOString(),version:JSON.parse(readFileSync(join(root,'package.json'),'utf8')).version,command:'repi --project ./wisconsin-study demo --dataset breast-cancer',dataset:frozen.protocol.dataset,source:frozen.source,protocolHash:aggregate.protocolHash,codeHash:aggregate.codeHash,tableHash:aggregate.tableHash,evidenceHash:aggregate.evidenceHash,rows:aggregate.rows,totalRuns:20,auditStatus:audit.status,scope:'Actual local measurements; training variability on one fixed dataset/split. Full receipts retained locally and recreated in CI. No clinical or agent-comparison claim.'},null,2)+'\n');
console.log('Study recording and provenance generated from actual evidence.');
