"""ResearchPi adapter example: training-only scaling and seeded SGD.

fit_predict receives training labels but no evaluation labels. It returns binary
predictions and probabilities for class 1. Runs with host-user permissions.
"""
from sklearn.linear_model import SGDClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


def fit_predict(x_train, y_train, x_test, seed, hyperparameters):
    model = make_pipeline(StandardScaler(), SGDClassifier(
        loss='log_loss', random_state=seed, max_iter=100, tol=None,
        alpha=hyperparameters.get('alpha', 0.001)))
    model.fit(x_train, y_train)
    return model.predict(x_test), model.predict_proba(x_test)[:, 1]
