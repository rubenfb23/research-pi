"""Prepare public inputs and private graders; never mix their mount roots."""
import hashlib, json, pathlib, shutil, subprocess, sys, tarfile

source, output, repo = map(pathlib.Path, sys.argv[1:4])
expected = {
    'core_ood.json':'ad09c0cc164fd6d73b3891e2c42e8e04eee28aed861cb5a8e57a2a9f74f668c5',
    'corebench-current.py':'25d963d342946ce0befb913bd3435cda4030c0c69fd9c217b69d3e03ac37060a',
    'capsule-8610546.tar.gz':'9bd241870521aa68e67aded4b18c54d05b9a9513b488efcd39d4159b20ebac1c',
    'capsule-8185407.tar.gz':'2d9ba605b5c36051896caedc555e8d330dd7bd0392c9d3e60813b79d8d0e9d0e',
}
for name, digest in expected.items():
    if hashlib.sha256((source/name).read_bytes()).hexdigest()!=digest: raise ValueError('Pinned source hash mismatch: '+name)
if subprocess.check_output(['git','-C',str(source/'MLAgentBench'),'rev-parse','HEAD'],text=True).strip()!='5d71205cc20a8e95d43aa7cb7120e89ca3323e31': raise ValueError('MLAgentBench revision mismatch')
output.mkdir(parents=True, exist_ok=False)
inputs, private = output / 'inputs', output / 'private'
inputs.mkdir(); private.mkdir(mode=0o700)
manifest = json.loads((source / 'core_ood.json').read_text())
tasks = []
for capsule in ['capsule-8610546', 'capsule-8185407']:
    task = next(t for t in manifest if t['capsule_id'] == capsule)
    target = inputs / capsule
    target.mkdir()
    # Medium filter: retain reproduction instructions/environment, exclude results.
    with tarfile.open(source / (capsule + '.tar.gz')) as archive:
        for member in archive:
            parts = pathlib.PurePosixPath(member.name).parts
            if not parts or parts[0] != capsule or '..' in parts or member.issym() or member.islnk():
                raise ValueError('Unsafe archive member')
            rel = pathlib.Path(*parts[1:])
            if 'results' in rel.parts or '.git' in rel.parts or not member.isfile(): continue
            dest = target / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(archive.extractfile(member).read())
    questions = list(task['results'][0])
    prompt = (f"Task: codeocean_medium\n\nYour goal is to test the computational reproducibility of the repository cloned to your current directory, which is code from a scientific paper. Specifically, you need to {task['task_prompt']} to answer the following questions: {questions}. Your submitted answer should be a Python dictionary whose keys are exactly those questions and values are the answers. You should read the instructions on how to reproduce the capsule in REPRODUCING.md.")
    prompt += '\n\nLocal evaluation transport: write that dictionary as JSON to /work/submission.json. Also write /work/reproduce.sh with commands that reproduce the measured outputs from source and supplied data in a fresh copy. Do not fabricate results. This CPU environment has Python 3.11, NumPy, SciPy, Matplotlib, pandas and scikit-rf. External networking and Docker are unavailable. Bash and all ResearchPi native tools are available. Work in /work. All work must finish within 600 seconds. Explain any incomplete reproduction honestly in /work/report.md.'
    tasks.append(dict(id=capsule, suite='CORE-Bench Extended/OOD', level='medium', prompt=prompt))
    (private / (capsule + '.json')).write_text(json.dumps(task))
shutil.copy2(source / 'corebench-current.py', private / 'corebench-current.py')
target = inputs / 'vectorization'; target.mkdir()
upstream = source / 'MLAgentBench' / 'MLAgentBench' / 'benchmarks' / 'vectorization'
shutil.copytree(upstream / 'env', target, dirs_exist_ok=True)
shutil.copy2(source / 'MLAgentBench' / 'LICENSE', target / 'LICENSE')
shutil.copy2(upstream / 'env' / 'train.py', private / 'baseline.py')
shutil.copy2(upstream / 'scripts' / 'eval.py', private / 'mlagent-eval.py')
tasks.insert(0, dict(id='vectorization', suite='MLAgentBench', prompt=(upstream / 'scripts' / 'research_problem.txt').read_text() + '\n\nLocal evaluation transport: work in /work, retain the original Conv2DLayer interface and semantics, and leave your optimized train.py and submission.csv there. Correctness and runtime will also be independently tested against the original implementation on fresh inputs. Only NumPy may be used by the optimized forward method. This CPU environment has Python 3.11 and NumPy 1.26.4; external networking and Docker are unavailable. Bash and all ResearchPi native tools are available. Finish within 600 seconds and summarize measured evidence in report.md.'))
(output / 'tasks.json').write_text(json.dumps(tasks, indent=2))
def hashes(root):
    return {str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file()}
protocol = dict(version=1, tasks=[{k:v for k,v in t.items() if k!='prompt'} for t in tasks], taskFiles=hashes(inputs), graderFiles=hashes(private), prompts={t['id']:hashlib.sha256(t['prompt'].encode()).hexdigest() for t in tasks}, sources=dict(mlagentbench='5d71205cc20a8e95d43aa7cb7120e89ca3323e31', coreOOD='00cfba0d8d83c093eac856f39b4f450a0c8aad9f', hal='0dd6962c23147a11ee12751db85f28328dadd50f'), condition=dict(harness='ResearchPi native CLI', models=['deepseek-v4.1-flash','glm-5.3-flash'], provider='opencode-go', attemptsPerTaskModel=1, seconds=600, cpu=2, memory='3g', maxRequests=40, maxOutputTokensPerRequest=8192, thinking='medium', internet='model relay only; no web or package downloads', ordering='alternate model order per task', failurePolicy='retain every started attempt; no selective replacement'), limitations=['CPU feasibility subset, not official leaderboard scores', 'one attempt per task/model; no superiority inference', 'medium capsules in a shared modern Python environment, not original Code Ocean images', 'published tasks may be in model training data'])
protocol['localEndpoints'] = {'vectorization':'changed code, valid claimed runtime, correct fresh outputs and independently measured median speedup >= 1.10','core':'official answer correct, clean replay exits zero and independently parsed generated result matches submission'}
(output / 'protocol.json').write_text(json.dumps(protocol, indent=2))
context = output / 'image'; context.mkdir()
shutil.copy2(repo / 'scripts' / 'official-bench' / 'Dockerfile', context / 'Dockerfile')
shutil.copy2(repo / 'scripts' / 'official-bench' / 'requirements.lock.txt', context / 'requirements.lock.txt')
shutil.copy2(shutil.which('node'), context / 'node')
app = context / 'app'; app.mkdir()
for name in ['dist','resources','scripts','node_modules']:
    if name == 'scripts':
        # Agent runtime needs ordinary research scripts, never benchmark graders/generators.
        excluded = shutil.ignore_patterns('official-bench', 'research-index', 'render-official-benchmark.py', 'render-research-index.mjs', 'official-replay-parser.mjs', 'official-replay-parser.test.mjs')
        shutil.copytree(repo/name, app/name, symlinks=True, ignore=excluded)
    else:
        shutil.copytree(repo/name, app/name, symlinks=True)
for name in ['package.json','package-lock.json','repi']:
    shutil.copy2(repo/name, app/name)
print(json.dumps({'output':str(output), 'tasks':[t['id'] for t in tasks]}))
