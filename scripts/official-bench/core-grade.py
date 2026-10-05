"""Use unchanged upstream scoring methods without loading the HAL runtime."""
import ast, json, math, logging, sys
from decimal import Decimal
import numpy as np
from scipy.stats import t

source = open('/grader/corebench-current.py').read()
tree = ast.parse(source)
aliases = [n for n in tree.body if isinstance(n, (ast.Assign, ast.AnnAssign)) and any(s in ast.unparse(n).split('=')[0] for s in ['_ANSWER_ALIASES','_LIST_ANSWER_ALIASES'])]
original = next(n for n in tree.body if isinstance(n,ast.ClassDef) and n.name=='CoreBench')
methods = [n for n in original.body if isinstance(n,ast.FunctionDef) and n.name in ['__get_decimal_places','__eval_result_json']]
isolated = ast.ClassDef(name='CoreBench',bases=[],keywords=[],body=methods,decorator_list=[])
code = ast.fix_missing_locations(ast.Module(body=aliases+[isolated],type_ignores=[]))
namespace = dict(np=np,t=t,math=math,Decimal=Decimal,logger=logging.getLogger('official-grader'),Dict=dict)
exec(compile(code,'upstream-grader','exec'),namespace)
task = json.load(open('/grader/'+sys.argv[1]+'.json'))
try:
    reported = json.load(open('/submission/submission.json'))
    if not isinstance(reported,dict): raise ValueError('Submission must be a dictionary')
    result = namespace['CoreBench']()._CoreBench__eval_result_json(task['results'],reported,sys.argv[1])
    result['all_correct'] = result['correct_written_answers']+result['correct_vision_answers']==len(task['results'][0])
except Exception as e:
    result = dict(all_correct=False,error=str(e),correct_written_answers=0,correct_vision_answers=0)
print(json.dumps(result))
