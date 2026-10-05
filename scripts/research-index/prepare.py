"""Public development task pack and private mechanical references. Not a sealed scientific benchmark."""
import json, pathlib, sys, inspect
import numpy as np
root=pathlib.Path(sys.argv[1]); seed=int(sys.argv[2]); inputs=root/'inputs'; private=root/'private'; inputs.mkdir(); private.mkdir(mode=0o700)
def save(p,obj): p.write_text(json.dumps(obj,indent=2)+'\n')
rng=np.random.default_rng(seed)
seeds=list(range(103,1040,101))
def regression(draw):
    x=draw.normal(size=(250,9)); y=x@np.arange(1,10)/7+draw.normal(0,.8,250)
    return dict(trainX=x[:170].tolist(),trainY=y[:170].tolist(),testX=x[170:].tolist(),testY=y[170:].tolist(),seeds=seeds,alpha=2.0)
def measure(data):
    x=np.array(data['trainX']);y=np.array(data['trainY']);xt=np.array(data['testX']);yt=np.array(data['testY'])
    mu=x.mean(0);sd=x.std(0,ddof=0);a=np.column_stack([np.ones(len(x)),(x-mu)/sd]);b=np.column_stack([np.ones(len(xt)),(xt-mu)/sd])
    base=np.linalg.lstsq(a,y,rcond=None)[0];baseline=float(np.sqrt(np.mean((b@base-yt)**2)))
    values=[]
    for s in data['seeds']:
        ix=np.random.default_rng(s).integers(0,len(x),size=len(x));pen=np.eye(a.shape[1])*data['alpha'];pen[0,0]=0
        beta=np.linalg.solve(a[ix].T@a[ix]+pen,a[ix].T@y[ix]);values.append(float(np.sqrt(np.mean((b@beta-yt)**2))))
    return dict(baselineRmse=baseline,seeds=data['seeds'],candidateRmses=values,candidateMean=float(np.mean(values)),candidateSampleSd=float(np.std(values,ddof=1)),populationUncertaintyEstablished=False)
(private/'reference-analysis.py').write_text('import json,sys,numpy as np\n'+inspect.getsource(measure)+'\nprint(json.dumps(measure(json.load(open(sys.argv[1])))))\n')
data=regression(rng);probe=regression(np.random.default_rng(seed+179));save(private/'probe.json',probe)
# Subject-level paired bootstrap: unequal record counts make row and subject estimands differ.
subjects=[]
for i in range(23):
    n=3+i%8;baseline=rng.uniform(.2,1.3,n); candidate=baseline+rng.normal(-.035 if i<15 else .055,.09,n)
    subjects.append(dict(subject=f's{i:02d}',baselineLoss=baseline.tolist(),candidateLoss=candidate.tolist()))
differences=np.array([np.mean(s['candidateLoss'])-np.mean(s['baselineLoss']) for s in subjects])
boot=np.random.default_rng(917).choice(differences,size=(2000,len(differences)),replace=True).mean(1)
causal=[dict(site='A',treated=0,n=80,recovered=12),dict(site='A',treated=1,n=20,recovered=6),dict(site='B',treated=0,n=20,recovered=8),dict(site='B',treated=1,n=80,recovered=48),dict(site='C',treated=1,n=30,recovered=24)]
rate=lambda z:sum(r['recovered'] for r in causal if r['treated']==z)/sum(r['n'] for r in causal if r['treated']==z)
stat_expected=dict(subjectMeanDifference=float(differences.mean()),subjectSampleSd=float(differences.std(ddof=1)),bootstrapLower=float(np.quantile(boot,.025)),bootstrapUpper=float(np.quantile(boot,.975)),subjectCount=23,marginalRiskDifference=rate(1)-rate(0),allSiteAteIdentified=False,initializationSdIsPopulationInterval=False)
designs=[dict(id='A',groupSplit=True,fitPreprocess='train',selection='validation',featureAtPrediction=True),dict(id='B',groupSplit=False,fitPreprocess='train',selection='validation',featureAtPrediction=True),dict(id='C',groupSplit=True,fitPreprocess='all',selection='validation',featureAtPrediction=True),dict(id='D',groupSplit=True,fitPreprocess='train',selection='test',featureAtPrediction=True),dict(id='E',groupSplit=True,fitPreprocess='train',selection='validation',featureAtPrediction=False)]
design_expected=dict(validProtocols=['A'],leakageByProtocol={d['id']:dict(subject=not d['groupSplit'],preprocessing=d['fitPreprocess']=='all',selection=d['selection']=='test',temporal=not d['featureAtPrediction']) for d in designs},independentUnit='subject',tenInitializationSeedsEstablishPopulationUncertainty=False,externalHospitalClaimSupported=False)
registry=json.loads((root/'registry.json').read_text())
candidates=[]
for i,item in enumerate(registry):
    candidates.append(dict(id=f'r{i}-exact',doi=item['DOI'],title=item['title'][0],authors=[a.get('family','') for a in item.get('author',[])],year=item['issued']['date-parts'][0][0]))
    candidates.append(dict(id=f'r{i}-altered',doi=item['DOI'],title=item['title'][0]+' with guaranteed causal identification',authors=['FictionalAuthor'],year=1900))
lit_expected=dict(validReferences=[f'r{i}-exact' for i in range(len(registry))],mismatchedReferences=[f'r{i}-altered' for i in range(len(registry))],doiExistenceAloneVerifiesCitation=False,metadataAloneEstablishesScientificClaim=False,verifiedLiveInternet=False)
results=measure(data)
writing_expected=dict(candidateBetterOnAverage=results['candidateMean']<results['baselineRmse'],populationGeneralizationEstablished=False,causalImprovementEstablished=False,distinctBootstrapSeeds=10,independentTrainingInitializations=0,baselineNeedsTenIdenticalRefits=False)
specs=[
('bootstrap-reproduction','reproduction',False,{'study.json':data},results,"Implement analysis.py accepting an input JSON path argument. Fit training-only mean/population-SD scaling on the entire train partition, then add an intercept. Baseline uses np.linalg.lstsq with rcond=None once. For each of the ten seeds, independently draw len(train) indices with np.random.default_rng(seed).integers(0,len(train),size=len(train)), retain the frozen scaler, and solve (X.T@X + diag(0,alpha,...,alpha)) beta = X.T@y on that bootstrap. Measure test RMSE. Execute the script; print one JSON object and save the same object to answer.json with keys baselineRmse,seeds,candidateRmses,candidateMean,candidateSampleSd,populationUncertaintyEstablished. ddof=1 for sample SD. The script will be reexecuted on fresh inputs; never hardcode data-dependent outputs. Include actual execution evidence in report.md."),
('grouped-study-design','experimentation',True,{'designs.json':{'protocols':designs,'deployment':'new subjects at hospitals not present in this single-site dataset','unit':'repeated records within subject'}},design_expected,"Evaluate every proposed protocol for subject, preprocessing, selection and temporal leakage. Write answer.json with validProtocols (IDs), leakageByProtocol (ID -> {subject,preprocessing,selection,temporal}), independentUnit, tenInitializationSeedsEstablishPopulationUncertainty,externalHospitalClaimSupported. Also write protocol.md specifying the estimand, validation design, baselines, failure policy and appropriate uncertainty. Distinguish training-seed variability from population sampling."),
('clustered-and-causal-analysis','statistics_causality',True,{'observations.json':{'subjects':subjects,'causalCounts':causal,'bootstrapSeed':917,'bootstrapReplicates':2000,'causalAssumptions':'Consistency and exchangeability conditional on site are assumed; target includes all three sites.'}},stat_expected,"Calculate subject-mean candidate-minus-baseline loss differences, their mean and ddof=1 SD. Use np.random.default_rng(917).choice(differences,size=(2000,len(differences)),replace=True).mean(1), then np.quantile with linear interpolation for 2.5/97.5 percentiles. Compute marginal treated-minus-untreated recovery risk across the separate site table. Assess whether the all-site ATE is point identified under the stated assumptions. Write answer.json with subjectMeanDifference,subjectSampleSd,bootstrapLower,bootstrapUpper,subjectCount,marginalRiskDifference,allSiteAteIdentified,initializationSdIsPopulationInterval. Write analysis.py and execute it. Explain estimand, sampling unit, positivity, identification limits and sensitivity options in report.md."),
('bibliographic-integrity','literature',True,{'registry.json':registry,'candidates.json':candidates},lit_expected,"Audit the candidate citations against the supplied real Crossref metadata snapshot. Write answer.json with validReferences,mismatchedReferences (IDs in input order),doiExistenceAloneVerifiesCitation,metadataAloneEstablishesScientificClaim,verifiedLiveInternet. Offline metadata inspection is not a fresh web verification. Write evidence.md distinguishing bibliographic validation from evidence for a scientific claim; use actual source titles and DOI identifiers, identify mismatched metadata and discuss what needs full-text verification. Internet is unavailable."),
('evidence-grounded-paper','scientific_writing',True,{'measured-results.json':results,'study-scope.json':{'data':'synthetic linear regression; one fixed split','baseline':'OLS once','candidate':'ridge fitted on ten bootstrapped training samples','novelty':'a controlled methodological illustration, not a new algorithm or literature priority claim'}},writing_expected,"Write answer.json with candidateBetterOnAverage,populationGeneralizationEstablished,causalImprovementEstablished,distinctBootstrapSeeds,independentTrainingInitializations,baselineNeedsTenIdenticalRefits. Write paper.md with Abstract, Introduction, Related Work, Materials and Methods, Results, Discussion, Conclusion. Accurately state the supplied measured outcomes, uncertainty scope, limitations and modest contribution. Explain the contribution in abstract, introduction and conclusion; end the introduction with a structure paragraph. Define abbreviations and methods before using them. Do not invent references or suggest this illustration is a discovered new algorithm. Save a readable results figure as figure.png from the measured per-seed values and explain it in the paper. Scientific writing quality requires later independent expert review.")]
tasks=[]
for id,domain,expert,files,expected,instruction in specs:
    folder=inputs/id;folder.mkdir()
    for name,obj in files.items():save(folder/name,obj)
    criteria=list(expected)
    if domain=='reproduction': criteria+=['scriptExecuted','freshReplay','perturbedInputReplay']
    if domain=='scientific_writing':criteria+=['paperSectionsPresent','figurePresent']
    if domain=='experimentation':criteria+=['protocolArtifactPresent']
    if domain in ['statistics_causality','literature']:criteria+=['explanationArtifactPresent']
    save(private/(id+'.json'),{'expected':expected,'probeExpected':measure(probe) if domain=='reproduction' else None})
    tasks.append(dict(id=id,domain=domain,family=id,requiresExpertReview=expert,criteria=criteria,prompt='Public Research Agent Index DEVELOPMENT task, not an official benchmark. Work in /work with the supplied evidence. '+instruction+' Preserve original input files. JSON numeric tolerances are 1e-5 absolute plus 1e-5 relative. Do not seek a grader or expected answer. All reasoning must be reflected in artifacts, not just chat.'))
save(root/'tasks.json',tasks)
print(json.dumps({'tasks':len(tasks),'seed':seed,'scope':'five public development tasks; mechanical checks only; expert review pending'}))
