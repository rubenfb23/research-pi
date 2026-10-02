"""Allowlisted CPU worker. Receives a validated frozen configuration from stdin.

Never accepts a code path, shell command, arbitrary estimator or user-written result.
Emits measured predictions, metrics, environment and dataset fingerprint to stdout.
"""
import hashlib
import json
import platform
import sys
import time
import warnings
import numpy as np
import sklearn
import scipy
from sklearn.datasets import make_classification
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import accuracy_score, log_loss
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


def main():
    request = json.load(sys.stdin)
    protocol, method, seed = request['protocol'], request['method'], request['seed']
    dataset, split = protocol['dataset'], protocol['split']
    start = time.monotonic()
    x, y = make_classification(n_samples=dataset['nSamples'], n_features=dataset['nFeatures'],
                               n_informative=dataset['nInformative'], n_redundant=2,
                               random_state=dataset['dataSeed'])
    train_idx, test_idx = train_test_split(np.arange(len(y)), test_size=split['testFraction'],
                                          random_state=split['splitSeed'], stratify=y)
    digest = hashlib.sha256()
    for arr in [x, y, train_idx, test_idx]:
        digest.update(np.ascontiguousarray(arr).tobytes())
    hp = method['hyperparameters']
    if method['algorithm'] == 'sgd_logistic':
        model = make_pipeline(StandardScaler(), SGDClassifier(loss='log_loss', alpha=hp['alpha'],
                              max_iter=hp['max_iter'], tol=None, shuffle=True, random_state=seed))
    elif method['algorithm'] == 'random_forest':
        model = RandomForestClassifier(n_estimators=hp['n_estimators'], max_depth=hp['max_depth'],
                                        bootstrap=True, random_state=seed, n_jobs=1)
    else:
        raise ValueError('Unsupported algorithm')
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        model.fit(x[train_idx], y[train_idx])
        predictions = model.predict(x[test_idx])
        probabilities = model.predict_proba(x[test_idx])[:, 1]
    # A common, explicit clip makes metrics independently recalculable across JS/Python.
    probabilities = np.clip(probabilities, 1e-15, 1-1e-15)
    result = {
        'seed': seed, 'method': method, 'dataHash': digest.hexdigest(),
        'environment': {'python': platform.python_version(), 'numpy': np.__version__,
                        'scikitLearn': sklearn.__version__, 'scipy': scipy.__version__,
                        'platform': platform.platform(), 'machine': platform.machine(), 'device': 'cpu', 'threads': 1},
        'durationSeconds': time.monotonic()-start,
        'trainSamples': len(train_idx), 'testSamples': len(test_idx),
        'metrics': {'accuracy': float(accuracy_score(y[test_idx], predictions)),
                    'log_loss': float(log_loss(y[test_idx], probabilities, labels=[0, 1]))},
        'predictions': {'testIndices': test_idx.tolist(), 'labels': y[test_idx].tolist(),
                        'predicted': predictions.tolist(), 'probabilities': probabilities.tolist()},
        'warnings': [str(w.message) for w in caught],
    }
    print(json.dumps(result, allow_nan=False))


if __name__ == '__main__':
    main()
