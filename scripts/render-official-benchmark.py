"""Export reviewed aggregate metrics; never publish task answers or raw traces."""
import collections, hashlib, html, json, pathlib, subprocess, sys

run, repo = map(pathlib.Path, sys.argv[1:3])
raw = json.loads((run/'results.json').read_text())
if raw['status']!='complete' or len(raw['attempts'])!=6: raise ValueError('Expected a completed six-attempt pilot')
frozen = json.loads((run/'frozen-protocol.json').read_text())
attempts=[]
for row in raw['attempts']:
    events=json.loads((run/row['id']/'requests.json').read_text())
    tools=collections.Counter(); sdk=dict(input=0,output=0,cacheRead=0,cacheWrite=0,catalogUSD=0.0); errors=[]; tool_errors=0
    for line in (run/row['id']/'native-trace.jsonl').read_text().splitlines():
        try: event=json.loads(line)
        except json.JSONDecodeError: continue
        if event.get('type')=='tool_execution_start': tools[event.get('toolName','unknown')]+=1
        if event.get('type')=='tool_execution_end' and event.get('isError'): tool_errors+=1
        if event.get('type')=='message_end' and event.get('message',{}).get('role')=='assistant':
            usage=event['message'].get('usage',{})
            for key in ['input','output','cacheRead','cacheWrite']: sdk[key]+=usage.get(key,0)
            sdk['catalogUSD']+=usage.get('cost',{}).get('total',0)
            if event['message'].get('stopReason')=='error':errors.append(event['message'].get('errorMessage','Provider error'))
    grade=json.loads(json.dumps(row['grade']))
    correction=None
    if row['task']=='capsule-8185407' and grade.get('reproduction',{}).get('status')=='completed':
        program="import {readFileSync} from 'node:fs';import {transducerFPower} from './scripts/official-replay-parser.mjs';console.log(JSON.stringify(transducerFPower(readFileSync(process.argv[1],'utf8'))));"
        measured=json.loads(subprocess.check_output(['node','--input-type=module','-e',program,str((run/row['id']/'replay-output.jsonl').resolve())],cwd=repo,text=True))
        submission=json.loads((run/row['id']/'work/submission.json').read_text())
        reported=float(next(iter(submission.values())))
        matches=measured is not None and abs(measured-reported)<=max(1e-6,abs(measured)*1e-5)
        before=grade['success'];grade['reproduction']['matchesSubmission']=matches
        grade['success']=grade.get('official',{}).get('all_correct') is True and matches
        correction=dict(kind='replay stdout parser correction',rawSuccess=before,correctedSuccess=grade['success'],method='Bound each Pload value to its own transducer block; reject conflicting F measurements',parserHash=hashlib.sha256((repo/'scripts/official-replay-parser.mjs').read_bytes()).hexdigest(),rawResultHash=hashlib.sha256((run/row['id']/'result.json').read_bytes()).hexdigest())
    # Measured answer values, raw errors and private paths are deliberately omitted.
    if row['task']=='vectorization': exported={k:grade.get(k) for k in ['success','correct','codeChanged','officialReportedSeconds','independentBaselineSeconds','independentCandidateSeconds','speedup','probeError']}
    else: exported=dict(success=grade.get('success',False),official=grade.get('official'),reproduction={k:grade.get('reproduction',{}).get(k) for k in ['status','exitCode','matchesSubmission','outputHash']})
    attempts.append(dict(id=row['id'],task=row['task'],suite=row['suite'],model=row['model'],status=row['status'],seconds=row['seconds'],requests=row['requests'],usage=sdk,toolCalls=dict(tools),toolErrors=tool_errors,providerErrorCount=len(errors),effectiveReasoning=sorted(set(e.get('settings',{}).get('reasoning_effort','unspecified') for e in events)),returnedModels=sorted(set(e['returnedModel'] for e in events if e.get('returnedModel'))),grade=exported,gradingCorrection=correction))
result=dict(runId=run.name,status=raw['status'],finished=raw['finished'],frozenProtocolHash=raw['frozenProtocolHash'],imageId=frozen['imageId'],sources=frozen['sources'],condition=frozen['condition'],localEndpoints=frozen['localEndpoints'],limitations=frozen['limitations'],attempts=attempts,infrastructureRun=dict(runId='42dc5ce2-5802-4cb9-afc3-981fc17e1ff4',excluded=True,reason='Relay omitted required native session header; all six requests rejected before generation. Retained separately; complete balanced matrix rerun after repair.'))
out=repo/'docs/research';(out/'deepseek-vs-glm-official-pilot.json').write_text(json.dumps(result,indent=2)+'\n')
names={'vectorization':'NumPy convolution optimization','capsule-8610546':'Stochastic control reproduction','capsule-8185407':'Legacy transducer reproduction'}
models=frozen['condition']['models']
rows=[]
for task in names:
    cells=[]
    for model in models:
        a=next(a for a in attempts if a['task']==task and a['model']==model);g=a['grade']
        verdict='Pass' if g['success'] else 'Not completed'
        metric=f"{g['speedup']:.1f}× independently measured speedup" if task=='vectorization' and g.get('speedup') else ('Official answer correct' if g.get('official',{}).get('all_correct') else 'Official answer missing / incorrect')
        replay='' if task=='vectorization' else ' · Replay '+str(g.get('reproduction',{}).get('status'))
        session_note='' if a['status']=='completed' else '<br><b class="fail">Session: '+html.escape(a['status'])+'</b>'
        cells.append(f'<td><b class="{"pass" if g["success"] else "fail"}">{verdict}</b><br>{html.escape(metric+replay)}{session_note}<br><small>{a["seconds"]:.1f}s · {a["requests"]} requests · ${a["usage"]["catalogUSD"]:.4f} catalog estimate</small></td>')
    rows.append('<tr><th scope="row">'+html.escape(names[task])+'<br><small>'+html.escape(task)+'</small></th>'+''.join(cells)+'</tr>')
cards=[]
for model in models:
    cells=[a for a in attempts if a['model']==model]
    cards.append(f'<div><span>{html.escape(model)}</span><strong>{sum(a["grade"]["success"] for a in cells)}/3</strong><small>Local artifact endpoints · {sum(a["status"]=="completed" for a in cells)}/3 sessions ended normally<br>{sum(a["seconds"] for a in cells):.1f}s total agent time · {sum(a["requests"] for a in cells)} requests</small></div>')
details=[]
for a in attempts:
    g=a['grade'];metric=(f"Claimed runtime: {g.get('officialReportedSeconds')} s. Independent median: {g.get('independentCandidateSeconds')} s; baseline: {g.get('independentBaselineSeconds')} s; correctness: {g.get('correct')}." if a['task']=='vectorization' else f"Official correct written answers: {g.get('official',{}).get('correct_written_answers',0)}. Fresh replay status: {g.get('reproduction',{}).get('status')}; agreement with submission: {g.get('reproduction',{}).get('matchesSubmission')}.")
    details.append(f'<details><summary>{html.escape(a["task"]+" · "+a["model"])}</summary><p>{html.escape(metric)}</p><p>Effective reasoning field: {html.escape(", ".join(a["effectiveReasoning"]))}. Returned model: {html.escape(", ".join(a["returnedModels"]))}. Tool calls: {html.escape(json.dumps(a["toolCalls"]))}. Tool errors: {a["toolErrors"]}; provider errors: {a["providerErrorCount"]}.</p></details>')
css=':root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0c1424;color:#edf2fa;font:16px/1.6 system-ui,sans-serif}main{max-width:1150px;margin:auto;padding:40px 24px}h1{font-size:clamp(28px,5vw,44px);line-height:1.2}a{color:#93c5fd}small,.muted{color:#aabbd1}.badge{color:#7dd3fc;letter-spacing:.1em;font-size:12px}section{border:1px solid #30405a;border-radius:14px;padding:24px;margin:24px 0;background:#131f33}.notice{border-left:4px solid #fbbf24;padding:16px 20px;background:#2b251c}.cards{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0}.cards div{border:1px solid #30405a;border-radius:10px;padding:20px}.cards strong,.cards span,.cards small{display:block}.cards strong{font-size:40px;color:#7dd3fc}table{width:100%;border-collapse:collapse;min-width:750px}th,td{text-align:left;padding:16px;border-bottom:1px solid #30405a}th{width:30%}.scroll{overflow:auto}.pass{color:#86efac}.fail{color:#fbbf24}details{padding:14px 0;border-bottom:1px solid #30405a}summary{cursor:pointer}footer{font-size:13px;color:#aabbd1}@media(max-width:700px){.cards{grid-template-columns:1fr}main{padding:24px 16px}section{padding:16px}}'
page=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DeepSeek vs GLM · Official scientific pilot</title><style>{css}</style></head><body><main><div class="badge">RESEARCHPI · OFFICIAL TASKS · OCTOBER 5, 2026</div><h1>DeepSeek V4.1 Flash vs GLM-5.3 Flash</h1><p class="muted">Full native ResearchPi CLI · OpenCode Go · MLAgentBench + CORE-Bench Extended/OOD</p><div class="notice"><b>Exploratory CPU subset.</b> Three tasks, one fresh attempt per model/task. This compares models within ResearchPi. It cannot establish a harness advantage, statistical superiority or an official full-suite score.</div><div class="cards">{''.join(cards)}</div><section><h2>Executed tasks and independently checked outputs</h2><p>CORE uses unchanged official answer grading plus a separate clean replay. NumPy uses the official claimed runtime plus an independent correctness and timing probe. The local NumPy completion endpoint requires at least 1.10× speedup with changed code and correct outputs.</p><div class="scroll"><table><thead><tr><th>Published task</th><th>DeepSeek V4.1 Flash</th><th>GLM-5.3 Flash</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div></section><section><h2>Conditions and interpretation</h2><p>600 seconds, 40 inference requests, 8,192 requested output tokens per response, two CPU cores and 3 GiB RAM per attempt. Model order alternates across tasks. The native harness retains filesystem, shell, research tools, code mode, compaction and retries. Inputs, prompts, evaluator code and runtime image were frozen before the retained model run.</p><p>Requested thinking is medium; effective wire fields are reported below. Each provider may implement reasoning differently. External browsing and package downloads are unavailable in this controlled environment; inference uses a credential-blind relay. The shared Python 3.11 stack is a local adaptation of CORE medium capsules, including legacy dependency repair.</p><p>Times are agent wall time and exclude setup and evaluator/replay time. Dollar amounts are SDK catalog estimates from reported usage, not verified account charges. Correct answers and replay consistency do not certify scientific validity or exclude hardcoded solutions. Published tasks may have appeared in training data.</p><p>Full PaperBench, GPU training, Terminal-Bench, other harnesses and repeated-session inference remain pending. The other CORE tasks were not silently replaced by synthetic tasks.</p></section><section><h2>Per-attempt receipts</h2>{''.join(details)}</section><section><h2>Audit and reproduction</h2><p>An initial six-request infrastructure run was rejected by OpenCode before generation because the relay omitted a required session header. Its artifacts remain private and marked invalid. After fixing transport and preventing unchanged NumPy code from passing on timing noise, the entire matrix was rerun. No unfavorable valid model attempt was replaced.</p><p>Both CORE reference executions and NumPy baseline probes passed before model runs. The corrected official grader accepted reference answers and rejected a deliberately wrong answer. All 88 existing tests and two relay/artifact tests passed during preparation.</p><p><a href="../../scripts/official-bench/README.md">Run instructions</a> · <a href="official-benchmark-preflight.md">Task sources and licenses</a> · <a href="deepseek-vs-glm-official-pilot.json">Sanitized results JSON</a> · <a href="deepseek-vs-glm-microtasks-history.html">Historical generated microtask comparison</a></p></section><footer>Run {html.escape(run.name)} · protocol SHA-256 {html.escape(raw['frozenProtocolHash'])}<br>Docker image {html.escape(frozen['imageId'])}. Raw traces and answers remain outside published documentation.</footer></main></body></html>'''
old=out/'deepseek-vs-glm-research-pilot.html';history=out/'deepseek-vs-glm-microtasks-history.html'
if not history.exists():history.write_text(old.read_text())
old.write_text(page)
lines=['# DeepSeek vs GLM: official scientific CPU pilot','',f'Run `{run.name}`. Full native ResearchPi CLI, OpenCode Go. One attempt per model/task; exploratory feasibility subset, not official suite scores.','', '| Task | Model | Local completion | Agent seconds | Requests | Speedup / replay |','|---|---|---:|---:|---:|---|']
for a in attempts:
    g=a['grade'];metric=f"{g.get('speedup'):.2f}x" if g.get('speedup') else str(g.get('reproduction',{}).get('status','unavailable'))
    lines.append(f"| {a['task']} | {a['model']} | {g['success']} | {a['seconds']:.1f} | {a['requests']} | {metric} |")
lines+=['','The HTML report contains settings, caveats and per-attempt receipts. Official answers are scored separately from additional local completion endpoints. Raw traces, candidate artifacts and reference answers remain in the ignored workspace.','',f"Protocol SHA-256: `{raw['frozenProtocolHash']}`.",'','See [reproduction commands](../../scripts/official-bench/README.md), [source provenance](official-benchmark-preflight.md), and [sanitized results](deepseek-vs-glm-official-pilot.json).']
(out/'deepseek-vs-glm-official-pilot.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'report':str(old),'run':run.name,'attempts':len(attempts)}))
