"""Run separately for baseline and candidate; never mount reference code with candidate."""
import importlib.util, json, time, numpy as np
clock = time.perf_counter
spec = importlib.util.spec_from_file_location('solution', '/work/train.py')
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
outputs = []
for seed, shape, kernel, stride, padding, activation in [
    (109, (2,7,8,3), 3,1,0,'relu'), (211,(1,8,9,2),3,2,1,'relu'),
    (307,(3,5,6,1),2,1,2,'relu'), (401,(1,6,7,2),1,2,0,None),
    (503,(2,8,8,3),3,2,2,None), (601,(1,5,5,1),3,1,1,'relu')]:
    rng = np.random.default_rng(seed)
    features = rng.normal(size=shape)
    layer = module.Conv2DLayer(shape[-1],4,kernel,stride,padding,activation)
    layer.kernel_matrices = rng.normal(size=(kernel,kernel,shape[-1],4))
    layer.biases = rng.normal(size=(1,1,1,4))
    outputs.append(layer.forward(features).tolist())
times = []; checksums = []
for seed in [709,811,907]:
    rng = np.random.default_rng(seed)
    features = rng.normal(size=(32,64,64,3))
    layer = module.Conv2DLayer(3,8,3,2,2,'relu')
    layer.kernel_matrices = rng.normal(size=(3,3,3,8)); layer.biases = rng.normal(size=(1,1,1,8))
    start = clock(); out = layer.forward(features); times.append(clock()-start)
    checksums.append([float(out.sum()),float(np.square(out).sum())])
print(json.dumps({'outputs':outputs,'seconds':times,'checksums':checksums},allow_nan=False))
