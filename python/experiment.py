"""Allowlisted CPU worker. Receives a validated frozen configuration from stdin.

Supports allowlisted estimators and an explicitly frozen custom Python adapter.
Custom code runs with host permissions; it is not a sandbox.
Emits measured predictions, metrics, environment and dataset fingerprint to stdout.
"""
import csv
import importlib.util
from pathlib import Path
from contextlib import redirect_stdout
import hashlib
import json
import platform
import sys
import time
import warnings
import numpy as np
import sklearn
import scipy
from sklearn.datasets import make_classification, load_breast_cancer
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
    if dataset['kind'] == 'synthetic_classification':
        x, y = make_classification(n_samples=dataset['nSamples'], n_features=dataset['nFeatures'],
                                   n_informative=dataset['nInformative'], n_redundant=2,
                                   random_state=dataset['dataSeed'])
    elif dataset['kind'] == 'breast_cancer':
        x, y = load_breast_cancer(return_X_y=True)
    elif dataset['kind'] == 'csv_binary':
        raw = Path(dataset['path']).read_bytes()
        if hashlib.sha256(raw).hexdigest() != dataset['sha256']:
            raise ValueError('Frozen CSV snapshot changed')
        with open(dataset['path'], encoding='utf-8-sig', newline='') as handle:
            rows = list(csv.DictReader(handle))
        x = np.array([[float(row[name]) for name in dataset['features']] for row in rows], dtype=np.float64)
        y = np.array([float(row[dataset['target']]) for row in rows], dtype=np.float64)
        if not np.isfinite(x).all() or not np.isin(y, [0, 1]).all():
            raise ValueError('Invalid CSV values')
        y = y.astype(np.int64)
    else:
        raise ValueError('Unsupported dataset')
    if x.shape != (dataset['nSamples'], dataset['nFeatures']):
        raise ValueError('Dataset dimensions changed')
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
    elif method['algorithm'] == 'custom_python':
        implementation = method['implementation']
        if hashlib.sha256(Path(implementation['path']).read_bytes()).hexdigest() != implementation['sha256']:
            raise ValueError('Frozen method snapshot changed')
        model = None
    else:
        raise ValueError('Unsupported algorithm')
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        if model is None:
            # User code runs with host permissions, without inherited API credentials.
            # Test labels are not passed to fit_predict; OS isolation is not claimed.
            spec = importlib.util.spec_from_file_location('researchpi_user_method', implementation['path'])
            module = importlib.util.module_from_spec(spec)
            with redirect_stdout(sys.stderr):
                spec.loader.exec_module(module)
                predictions, probabilities = module.fit_predict(x[train_idx].copy(), y[train_idx].copy(),
                                                                  x[test_idx].copy(), seed, dict(hp))
            predictions, probabilities = np.asarray(predictions), np.asarray(probabilities, dtype=float)
        else:
            model.fit(x[train_idx], y[train_idx])
            predictions = model.predict(x[test_idx])
            probabilities = model.predict_proba(x[test_idx])[:, 1]
        if predictions.shape != (len(test_idx),) or probabilities.shape != (len(test_idx),) or not np.isin(predictions, [0, 1]).all() or not np.isfinite(probabilities).all() or np.any((probabilities < 0) | (probabilities > 1)):
            raise ValueError('Method must return one binary prediction and probability per test sample')
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
