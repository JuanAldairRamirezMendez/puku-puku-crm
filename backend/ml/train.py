#!/usr/bin/env python3
"""
Puku Puku CRM — ML Churn Prediction Pipeline
============================================
1. Generate synthetic training data with realistic noise (nulls, outliers)
2. Engineer 31 features
3. Train & evaluate 12 ML models with Pipeline + GridSearchCV
4. Calibrate decision threshold for optimal F1
5. Unsupervised clustering: K-Means (elbow+silhouette), DBSCAN (k-distance)
6. Export model as JSON for JavaScript inference

Usage:
  python train.py                          # full pipeline
  python train.py --json                   # write results.json on finish
  python train.py --output-dir ./output    # custom output dir
"""

import warnings
warnings.filterwarnings('ignore')

import json, math, pickle, os, sys, argparse
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from pathlib import Path
from datetime import datetime, timedelta
from collections import Counter
from itertools import product
import random

import numpy as np
import pandas as pd
from sklearn.model_selection import (
    train_test_split, StratifiedKFold, cross_val_score, GridSearchCV
)
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    roc_curve, precision_recall_curve, silhouette_score,
    davies_bouldin_score, calinski_harabasz_score
)
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import (
    RandomForestClassifier, GradientBoostingClassifier,
    ExtraTreesClassifier, AdaBoostClassifier
)
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.cluster import KMeans, DBSCAN
from sklearn.neighbors import NearestNeighbors
import xgboost as xgb
import lightgbm as lgb
import joblib

try:
    from imblearn.over_sampling import SMOTE
    from imblearn.pipeline import Pipeline as ImbPipeline
    HAS_SMOTE = True
except ImportError:
    HAS_SMOTE = False

SEED = 42
np.random.seed(SEED)
random.seed(SEED)

parser = argparse.ArgumentParser(description='ML Churn Prediction Pipeline')
parser.add_argument('--json', action='store_true', help='Write results.json on completion')
parser.add_argument('--output-dir', type=str, default=None, help='Custom output directory')
args = parser.parse_args()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ML_DIR = BASE_DIR / 'backend' / 'ml'
OUTPUT_DIR = Path(args.output_dir) if args.output_dir else (ML_DIR / 'output')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CANALES = ['PRESENCIAL', 'WHATSAPP', 'INSTAGRAM', 'RAPPI', 'PEDIDOSYA']
SATISFACCION = ['SATISFECHO', 'NEUTRO', 'INSATISFECHO']
PRODUCTOS = ['Cafe Latte', 'Cafe Americano', 'Cappuccino', 'Mocha', 'Matcha Latte',
             'Chai Latte', 'Expresso Doble', 'Affogato', 'Cold Brew', 'Flat White',
             'Croissant', 'Alfajor', 'Cheesecake', 'Brownie', 'Sandwich']

NOMBRES = [
    'Lucia Morales', 'Mateo Castillo', 'Camila Rivera', 'Santiago Vargas',
    'Valentina Lopez', 'Sebastian Torres', 'Isabella Ramirez', 'Gabriel Garcia',
    'Sofia Chavez', 'Andres Mendoza', 'Emma Ortiz', 'Daniel Vega',
    'Mia Delgado', 'Lucas Rojas', 'Abril Campos', 'Benjamin Herrera',
    'Luna Paredes', 'Alejandro Cruz', 'Amanda Silva', 'Nicolas Flores',
    'Zoe Peña', 'Samuel Cordova', 'Victoria Quispe', 'Diego Navarro',
    'Martina Guzman', 'Adrian Huaman', 'Regina Espinoza', 'Thiago Bravo',
    'Rafaela Tapia', 'Joaquin Leon', 'Emilia Guerrero', 'Maximo Molina',
    'Julieta Calvo', 'Luciano Ponce', 'Catalina Macias', 'Leonardo Rios',
    'Valeria Sotomayor', 'Bruno Cardenas', 'Elena Aguilar', 'Facundo Yupanqui'
]


def generate_customer_data(n_customers=8000):
    """Generate synthetic customer data with realistic patterns and known churn labels."""
    records = []
    for _ in range(n_customers):
        profile = random.choices(
            ['frecuente_fiel', 'regular', 'ocasional', 'nuevo', 'riesgo_alto'],
            weights=[0.18, 0.30, 0.25, 0.12, 0.15]
        )[0]

        if profile == 'frecuente_fiel':
            n_base = random.randint(15, 40)
            prob_churn = 0.03
            ticket_mean, ticket_std = 32, 8
            satisfaccion_weights = [0.75, 0.20, 0.05]
            dias_desde_ultima = random.randint(0, 10)
            diversity = random.uniform(0.7, 1.0)
        elif profile == 'regular':
            n_base = random.randint(6, 16)
            prob_churn = 0.20
            ticket_mean, ticket_std = 22, 10
            satisfaccion_weights = [0.50, 0.35, 0.15]
            dias_desde_ultima = random.randint(3, 25)
            diversity = random.uniform(0.4, 0.8)
        elif profile == 'ocasional':
            n_base = random.randint(2, 7)
            prob_churn = 0.45
            ticket_mean, ticket_std = 18, 10
            satisfaccion_weights = [0.30, 0.40, 0.30]
            dias_desde_ultima = random.randint(10, 40)
            diversity = random.uniform(0.2, 0.5)
        elif profile == 'nuevo':
            n_base = random.randint(1, 4)
            prob_churn = 0.55
            ticket_mean, ticket_std = 20, 9
            satisfaccion_weights = [0.55, 0.30, 0.15]
            dias_desde_ultima = random.randint(5, 35)
            diversity = random.uniform(0.2, 0.6)
        else:
            n_base = random.randint(1, 5)
            prob_churn = 0.80
            ticket_mean, ticket_std = 12, 7
            satisfaccion_weights = [0.15, 0.30, 0.55]
            dias_desde_ultima = random.randint(20, 90)
            diversity = random.uniform(0.1, 0.4)

        n_interactions = max(1, int(np.random.poisson(n_base)))
        first_date = datetime.now() - timedelta(days=random.randint(30, 365))
        dates = sorted([first_date + timedelta(
            days=random.randint(1, max(1, int((datetime.now() - first_date).days)))
        ) for _ in range(n_interactions)])[:n_interactions]

        is_churn = 1 if random.random() < prob_churn else 0

        if is_churn and dias_desde_ultima < 31:
            dias_desde_ultima = random.randint(31, 90)
        elif not is_churn and dias_desde_ultima > 30:
            dias_desde_ultima = random.randint(0, 28)

        last_date = datetime.now() - timedelta(days=dias_desde_ultima)
        for i in range(len(dates)):
            if dates[i] > last_date:
                dates[i] = last_date - timedelta(days=random.randint(0, 5))
        dates = sorted(dates)

        interactions = []
        unique_channels = set()
        for di, d in enumerate(dates):
            canal = random.choice(CANALES)
            unique_channels.add(canal)
            ticket = max(0, round(np.random.normal(ticket_mean, ticket_std), 2))
            sat = random.choices(SATISFACCION, weights=satisfaccion_weights)[0]
            producto = random.choice(PRODUCTOS)
            interactions.append({
                'fecha': d.isoformat(),
                'canal': canal,
                'monto_soles': ticket,
                'satisfaccion': sat,
                'producto': producto,
            })

        nombre = random.choice(NOMBRES)
        producto_fav = max(set(p['producto'] for p in interactions),
                          key=lambda x: sum(1 for p in interactions if p['producto'] == x))

        records.append({
            'nombre': nombre,
            'n_interacciones': len(interactions),
            'interacciones': interactions,
            'is_churn': is_churn,
            'profile': profile,
            'producto_favorito': producto_fav,
            'canales_usados': sorted(unique_channels),
        })

    return records


def engineer_features(records):
    """Extract 31 features from raw interaction data."""
    rows = []
    ahora = datetime.now()

    for r in records:
        interacciones = sorted(r['interacciones'], key=lambda x: x['fecha'])
        n = len(interacciones)
        if n == 0:
            continue

        fechas = [datetime.fromisoformat(i['fecha']) for i in interacciones]
        montos = [float(i['monto_soles']) for i in interacciones]
        canales = [i['canal'] for i in interacciones]
        satisfacciones = [i['satisfaccion'] for i in interacciones]

        primera_fecha = fechas[0]
        ultima_fecha = fechas[-1]
        dias_ultima = (ahora - ultima_fecha).days
        tenure = max(1, (ultima_fecha - primera_fecha).days)

        gaps = [(fechas[i+1] - fechas[i]).days for i in range(len(fechas)-1)]
        gap_mean = np.mean(gaps) if gaps else 0
        gap_std = np.std(gaps) if gaps else 0
        gap_max = max(gaps) if gaps else 0

        recency = min(dias_ultima, 365)

        freq_total = n
        freq_semanal = n / max(1, tenure / 7)
        freq_mensual = n / max(1, tenure / 30)
        interacciones_ultimo_mes = sum(1 for f in fechas if (ahora - f).days <= 30)
        interacciones_ultimo_trim = sum(1 for f in fechas if (ahora - f).days <= 90)

        ticket_promedio = np.mean(montos) if montos else 0
        ticket_total = sum(montos)
        ticket_max = max(montos) if montos else 0
        ticket_min = min(montos) if montos else 0
        ticket_std = np.std(montos) if len(montos) > 1 else 0
        ticket_ultimo = montos[-1] if montos else 0
        ticket_ultimo_mes = np.mean([m for m, f in zip(montos, fechas)
                                     if (ahora - f).days <= 30]) or 0
        if len(montos) >= 5:
            xs = np.arange(len(montos[-5:]))
            ticket_trend = np.polyfit(xs, montos[-5:], 1)[0]
        elif len(montos) >= 2:
            xs = np.arange(len(montos))
            ticket_trend = np.polyfit(xs, montos, 1)[0]
        else:
            ticket_trend = 0

        canales_unicos = len(set(canales))
        diversidad_canal = canales_unicos / len(CANALES)
        canal_mas_usado = Counter(canales).most_common(1)[0][0] if canales else 'PRESENCIAL'

        n_insatisfecho = sum(1 for s in satisfacciones if s == 'INSATISFECHO')
        n_satisfecho = sum(1 for s in satisfacciones if s == 'SATISFECHO')
        pct_insatisfecho = n_insatisfecho / n if n else 0
        pct_satisfecho = n_satisfecho / n if n else 0
        recientes_sat = [s for s, f in zip(satisfacciones, fechas)
                        if (ahora - f).days <= 90]
        pct_insatisfecho_reciente = (
            sum(1 for s in recientes_sat if s == 'INSATISFECHO') / len(recientes_sat)
            if recientes_sat else 0
        )

        if len(satisfacciones) >= 3:
            sat_val = {'INSATISFECHO': 0, 'NEUTRO': 0.5, 'SATISFECHO': 1}
            sat_vals = [sat_val[s] for s in satisfacciones[-5:]]
            sat_trend = sat_vals[-1] - sat_vals[0]
        else:
            sat_trend = 0

        regularidad = 1 / (1 + gap_std) if gaps else 0.5

        weekend_count = sum(1 for f in fechas if f.weekday() >= 5)
        weekend_ratio = weekend_count / n if n else 0

        night_count = sum(1 for f in fechas if f.hour >= 20)
        night_ratio = night_count / n if n else 0

        row = {
            'recency_dias': recency,
            'freq_total': freq_total,
            'freq_semanal': round(freq_semanal, 4),
            'freq_mensual': round(freq_mensual, 4),
            'interacciones_ultimo_mes': interacciones_ultimo_mes,
            'interacciones_ultimo_trim': interacciones_ultimo_trim,
            'ticket_promedio': round(ticket_promedio, 2),
            'ticket_total': round(ticket_total, 2),
            'ticket_max': round(ticket_max, 2),
            'ticket_min': round(ticket_min, 2),
            'ticket_std': round(ticket_std, 4),
            'ticket_ultimo': round(ticket_ultimo, 2),
            'ticket_ultimo_mes': round(ticket_ultimo_mes, 2),
            'ticket_trend': round(ticket_trend, 4),
            'diversidad_canal': round(diversidad_canal, 4),
            'pct_insatisfecho': round(pct_insatisfecho, 4),
            'pct_satisfecho': round(pct_satisfecho, 4),
            'pct_insatisfecho_reciente': round(pct_insatisfecho_reciente, 4),
            'sat_trend': round(sat_trend, 4),
            'tenure_dias': tenure,
            'gap_mean': round(gap_mean, 2),
            'gap_std': round(gap_std, 4),
            'gap_max': gap_max,
            'regularidad': round(regularidad, 4),
            'weekend_ratio': round(weekend_ratio, 4),
            'night_ratio': round(night_ratio, 4),
            'canal_WhatsApp': int(canal_mas_usado == 'WHATSAPP'),
            'canal_Instagram': int(canal_mas_usado == 'INSTAGRAM'),
            'canal_Rappi': int(canal_mas_usado == 'RAPPI'),
            'canal_PedidosYa': int(canal_mas_usado == 'PEDIDOSYA'),
            'canal_Presencial': int(canal_mas_usado == 'PRESENCIAL'),
            'is_churn': r['is_churn'],
        }
        rows.append(row)

    return pd.DataFrame(rows)


def inject_noise(df, null_pct=0.03, outlier_pct=0.02):
    """Inject realistic noise: null values + outliers."""
    original = df.copy()
    feature_cols = [c for c in df.columns if c != 'is_churn']
    n_rows = len(df)

    # 1) Null values
    if null_pct > 0:
        n_nulls = int(n_rows * null_pct)
        for col in feature_cols:
            idxs = np.random.choice(n_rows, n_nulls, replace=False)
            df.loc[idxs, col] = np.nan

    # 2) Outliers — extreme values in numeric columns
    if outlier_pct > 0:
        n_outliers = int(n_rows * outlier_pct)
        numeric_cols = [c for c in feature_cols if df[c].dtype in ('float64', 'int64')]
        for col in numeric_cols:
            if col in ('canal_WhatsApp', 'canal_Instagram', 'canal_Rappi', 'canal_PedidosYa', 'canal_Presencial'):
                continue
            idxs = np.random.choice(n_rows, n_outliers, replace=False)
            sign = np.random.choice([-1, 1], n_outliers)
            magnitude = np.random.uniform(5, 15, n_outliers)
            std_val = df[col].std() if df[col].std() > 0 else 1
            df.loc[idxs, col] = df[col].median() + sign * magnitude * std_val

    n_nulls_total = df.isna().sum().sum()
    n_outliers_total = outlier_pct * len(feature_cols) * n_rows
    print(f"  Ruido inyectado: {n_nulls_total} valores nulos, ~{int(n_outliers_total)} outliers")
    return df


def train_with_gridsearch(X_train, X_test, y_train, y_test, feature_names):
    """Train classifiers with Pipeline + GridSearchCV, return comparison + best model info."""
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # ── Define classifiers ──────────────────────────────────
    models = {}

    # SVM with GridSearch
    print("\n  [GridSearchCV] SVM — buscando C, gamma, kernel...")
    svm_grid = GridSearchCV(
        SVC(probability=True, class_weight='balanced', random_state=SEED),
        {
            'C': [0.1, 1, 10, 100],
            'gamma': ['scale', 'auto', 0.01, 0.1],
            'kernel': ['rbf', 'poly'],
        },
        cv=5, scoring='roc_auc', n_jobs=-1, verbose=0
    )
    svm_grid.fit(X_train_scaled, y_train)
    print(f"    SVM best params: {svm_grid.best_params_}  (AUC={svm_grid.best_score_:.4f})")
    models['SVM_RBF'] = svm_grid.best_estimator_

    # KNN with GridSearch
    print("\n  [GridSearchCV] KNN — buscando k, metric...")
    knn_grid = GridSearchCV(
        KNeighborsClassifier(weights='distance'),
        {
            'n_neighbors': [3, 5, 7, 9, 11, 15, 21],
            'metric': ['euclidean', 'manhattan', 'minkowski'],
        },
        cv=5, scoring='roc_auc', n_jobs=-1, verbose=0
    )
    knn_grid.fit(X_train_scaled, y_train)
    print(f"    KNN best params: {knn_grid.best_params_}  (AUC={knn_grid.best_score_:.4f})")
    models['KNN'] = knn_grid.best_estimator_

    # Fixed-param classifiers (tuned manually or fast)
    models['LogisticRegression'] = LogisticRegression(
        C=0.1, max_iter=1000, class_weight='balanced', random_state=SEED
    )
    models['DecisionTree'] = DecisionTreeClassifier(
        max_depth=10, min_samples_leaf=10, class_weight='balanced', random_state=SEED
    )
    models['RandomForest'] = RandomForestClassifier(
        n_estimators=200, max_depth=15, min_samples_leaf=5,
        class_weight='balanced', random_state=SEED, n_jobs=-1
    )
    models['ExtraTrees'] = ExtraTreesClassifier(
        n_estimators=200, max_depth=12, min_samples_leaf=5,
        class_weight='balanced', random_state=SEED, n_jobs=-1
    )
    models['GradientBoosting'] = GradientBoostingClassifier(
        n_estimators=200, max_depth=5, learning_rate=0.1,
        subsample=0.8, random_state=SEED
    )
    models['AdaBoost'] = AdaBoostClassifier(
        n_estimators=100, learning_rate=0.5, random_state=SEED
    )
    models['XGBoost'] = xgb.XGBClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.1,
        subsample=0.8, colsample_bytree=0.8,
        scale_pos_weight=1.5, random_state=SEED, n_jobs=-1,
        eval_metric='logloss'
    )
    models['LightGBM'] = lgb.LGBMClassifier(
        n_estimators=200, max_depth=8, learning_rate=0.1,
        subsample=0.8, colsample_bytree=0.8,
        class_weight='balanced', random_state=SEED, n_jobs=-1,
        verbose=-1
    )
    models['MLP'] = MLPClassifier(
        hidden_layer_sizes=(64, 32), max_iter=500,
        alpha=0.01, batch_size=64, random_state=SEED, early_stopping=True
    )
    models['NaiveBayes'] = GaussianNB()
    models['SVC_RBF'] = SVC(
        C=1.0, gamma='scale', probability=True,
        class_weight='balanced', random_state=SEED
    )

    # ── SMOTE (if available) ─────────────────────────────────
    if HAS_SMOTE:
        print(f"\n  [SMOTE] Aplicando oversampling (disponible)")
        smote = SMOTE(random_state=SEED)
        X_train_bal, y_train_bal = smote.fit_resample(X_train_scaled, y_train)
        print(f"    Train: {X_train_scaled.shape[0]} → {X_train_bal.shape[0]} samples (balanced)")
    else:
        print(f"\n  [SMOTE] No disponible — usando class_weight='balanced'")
        X_train_bal, y_train_bal = X_train_scaled, y_train

    # ── Evaluate all ─────────────────────────────────────────
    results = []
    best_model = None
    best_score = 0

    header = f"{'MODEL':<25} {'ACC':>8} {'PREC':>8} {'REC':>8} {'F1':>8} {'AUC':>8}"
    print(f"\n{'='*80}")
    print(header)
    print(f"{'='*80}")

    for name, model in models.items():
        try:
            # Fit
            if name == 'SVM_RBF' or name == 'KNN':
                # Already fitted on X_train_scaled, just predict
                y_pred = model.predict(X_test_scaled)
                y_prob = model.predict_proba(X_test_scaled)[:, 1]
            else:
                model.fit(X_train_bal, y_train_bal)
                y_pred = model.predict(X_test_scaled)
                y_prob = model.predict_proba(X_test_scaled)[:, 1]

            metrics = {
                'model': name,
                'accuracy': round(accuracy_score(y_test, y_pred), 4),
                'precision': round(precision_score(y_test, y_pred, zero_division=0), 4),
                'recall': round(recall_score(y_test, y_pred, zero_division=0), 4),
                'f1': round(f1_score(y_test, y_pred, zero_division=0), 4),
                'roc_auc': round(roc_auc_score(y_test, y_prob), 4),
            }
            results.append(metrics)
            print(f"{name:<25} {metrics['accuracy']:>8.4f} {metrics['precision']:>8.4f} "
                  f"{metrics['recall']:>8.4f} {metrics['f1']:>8.4f} {metrics['roc_auc']:>8.4f}")

            if metrics['roc_auc'] > best_score:
                best_score = metrics['roc_auc']
                best_model = (name, model, scaler, metrics)

        except Exception as e:
            print(f"{name:<25} FAILED: {str(e)[:50]}")

    print(f"{'='*80}")

    return results, best_model, X_train_scaled, X_test_scaled, scaler


def calibrate_threshold(model, X_val, y_val):
    """Find optimal probability threshold to maximize F1 score."""
    y_prob = model.predict_proba(X_val)[:, 1]
    precisions, recalls, thresholds = precision_recall_curve(y_val, y_prob)

    f1_scores = 2 * (precisions * recalls) / (precisions + recalls + 1e-10)
    best_idx = np.argmax(f1_scores[:-1])
    best_threshold = thresholds[best_idx]
    best_f1 = f1_scores[best_idx]

    # Apply threshold
    y_pred_opt = (y_prob >= best_threshold).astype(int)
    opt_f1 = f1_score(y_val, y_pred_opt)
    opt_acc = accuracy_score(y_val, y_pred_opt)

    print(f"\n  [Threshold Calibration]")
    print(f"    Default threshold: 0.50 → F1={f1_score(y_val, model.predict(X_val)):.4f}")
    print(f"    Optimal threshold: {best_threshold:.4f} → F1={opt_f1:.4f}, Acc={opt_acc:.4f}")

    return {
        'optimal_threshold': round(float(best_threshold), 4),
        'default_f1': round(float(f1_score(y_val, model.predict(X_val))), 4),
        'optimal_f1': round(float(opt_f1), 4),
        'optimal_accuracy': round(float(opt_acc), 4),
    }


def run_clustering(X_scaled, feature_names, churn_labels):
    """K-Means + DBSCAN clustering evaluation."""
    results = {}

    print(f"\n{'='*80}")
    print(f"  UNSUPERVISED CLUSTERING")
    print(f"{'='*80}")

    # ── K-Means: Elbow + Silhouette ─────────────────────────
    print(f"\n  [K-Means] Buscando k óptimo (2-10)...")
    inertias = []
    silhouettes = []
    k_range = range(2, 11)

    for k in k_range:
        kmeans = KMeans(n_clusters=k, random_state=SEED, n_init=10)
        labels = kmeans.fit_predict(X_scaled)
        inertias.append(kmeans.inertia_)
        sil = silhouette_score(X_scaled, labels)
        silhouettes.append(sil)
        print(f"    k={k:2d}  inertia={kmeans.inertia_:.1f}  silhouette={sil:.4f}")

    optimal_k = k_range[np.argmax(silhouettes)]
    print(f"\n  ** K-Means optimal k = {optimal_k} (silhouette={silhouettes[np.argmax(silhouettes)]:.4f})")

    final_kmeans = KMeans(n_clusters=optimal_k, random_state=SEED, n_init=10)
    kmeans_labels = final_kmeans.fit_predict(X_scaled)

    kmeans_sil = silhouette_score(X_scaled, kmeans_labels)
    kmeans_db = davies_bouldin_score(X_scaled, kmeans_labels)
    kmeans_ch = calinski_harabasz_score(X_scaled, kmeans_labels)

    print(f"\n  K-Means (k={optimal_k}) evaluation:")
    print(f"    Silhouette Score:      {kmeans_sil:.4f}  (>{'0.5 ✓' if kmeans_sil > 0.5 else '0.5 ✗'})")
    print(f"    Davies-Bouldin Index:  {kmeans_db:.4f}  ({'<1.0 ✓' if kmeans_db < 1.0 else '>1.0 ✗'})")
    print(f"    Calinski-Harabasz:     {kmeans_ch:.1f}")

    # Churn rate per cluster
    cluster_churn = pd.DataFrame({'cluster': kmeans_labels, 'churn': churn_labels})
    churn_by_cluster = cluster_churn.groupby('cluster')['churn'].agg(['mean', 'count'])
    print(f"\n  Churn rate per cluster:")
    for c in sorted(churn_by_cluster.index):
        r = churn_by_cluster.loc[c]
        print(f"    Cluster {c}: {r['mean']:.1%} churn ({int(r['count'])} customers)")

    results['kmeans'] = {
        'optimal_k': optimal_k,
        'inertias': [round(float(x), 1) for x in inertias],
        'silhouettes': [round(float(x), 4) for x in silhouettes],
        'silhouette_score': round(float(kmeans_sil), 4),
        'davies_bouldin': round(float(kmeans_db), 4),
        'calinski_harabasz': round(float(kmeans_ch), 1),
        'churn_by_cluster': {int(c): {'churn_rate': float(r['mean']), 'count': int(r['count'])}
                            for c, r in churn_by_cluster.iterrows()},
    }

    # ── DBSCAN: k-distance + clustering ────────────────────
    print(f"\n  [DBSCAN] Buscando eps óptimo (k-distance graph)...")
    neighbors = NearestNeighbors(n_neighbors=5)
    neighbors_fit = neighbors.fit(X_scaled)
    distances, _ = neighbors_fit.kneighbors(X_scaled)
    k_distances = np.sort(distances[:, 4])

    # Find elbow point (max curvature)
    diffs = np.diff(k_distances)
    elbow_idx = np.argmax(diffs) if len(diffs) > 0 else len(k_distances) // 4
    eps_opt = float(k_distances[min(elbow_idx, len(k_distances) - 1)])

    print(f"    eps sugerido (k-distance elbow): {eps_opt:.4f}")
    print(f"    Probando DBSCAN con eps={eps_opt:.4f}, min_samples=5...")

    dbscan = DBSCAN(eps=eps_opt, min_samples=5)
    dbscan_labels = dbscan.fit_predict(X_scaled)
    n_clusters_db = len(set(dbscan_labels)) - (1 if -1 in dbscan_labels else 0)
    n_noise = int(np.sum(dbscan_labels == -1))
    n_noise_pct = n_noise / len(dbscan_labels) * 100

    print(f"    DBSCAN result: {n_clusters_db} clusters, {n_noise} outliers ({n_noise_pct:.1f}%)")

    if n_clusters_db >= 2:
        db_sil = silhouette_score(X_scaled, dbscan_labels)
        db_db = davies_bouldin_score(X_scaled, dbscan_labels)
        db_ch = calinski_harabasz_score(X_scaled, dbscan_labels)
        print(f"    Silhouette Score:      {db_sil:.4f}  (>{'0.5 ✓' if db_sil > 0.5 else '0.5 ✗'})")
        print(f"    Davies-Bouldin Index:  {db_db:.4f}  ({'<1.0 ✓' if db_db < 1.0 else '>1.0 ✗'})")
        print(f"    Calinski-Harabasz:     {db_ch:.1f}")

        db_cluster_churn = pd.DataFrame({'cluster': dbscan_labels, 'churn': churn_labels})
        db_churn_by_cluster = db_cluster_churn[db_cluster_churn['cluster'] != -1].groupby('cluster')['churn'].agg(['mean', 'count'])
        print(f"\n  Churn rate per DBSCAN cluster:")
        for c in sorted(db_churn_by_cluster.index):
            r = db_churn_by_cluster.loc[c]
            print(f"    Cluster {c}: {r['mean']:.1%} churn ({int(r['count'])} customers)")

        results['dbscan'] = {
            'eps': round(eps_opt, 4),
            'min_samples': 5,
            'n_clusters': n_clusters_db,
            'n_noise': n_noise,
            'noise_pct': round(n_noise_pct, 1),
            'silhouette_score': round(float(db_sil), 4),
            'davies_bouldin': round(float(db_db), 4),
            'calinski_harabasz': round(float(db_ch), 1),
            'churn_by_cluster': {int(c): {'churn_rate': float(r['mean']), 'count': int(r['count'])}
                                for c, r in db_churn_by_cluster.iterrows()},
        }
    else:
        print(f"    Silhouette: N/A (<2 clusters)")
        results['dbscan'] = {
            'eps': round(eps_opt, 4),
            'min_samples': 5,
            'n_clusters': n_clusters_db,
            'n_noise': n_noise,
            'noise_pct': round(n_noise_pct, 1),
            'silhouette_score': None,
        }

    # ── Compare cluster purity vs churn ─────────────────────
    print(f"\n  [Cluster-Churn Alignment]")
    print(f"    K-Means clusters align with churn: clusters with churn_rate>0.5?")
    for c, info in results['kmeans']['churn_by_cluster'].items():
        print(f"      Cluster {c}: {info['churn_rate']:.1%} churn — {'ALTO RIESGO' if info['churn_rate'] > 0.5 else 'bajo riesgo'}")

    print(f"    DBSCAN clusters align with churn:")
    if 'churn_by_cluster' in results.get('dbscan', {}):
        for c, info in results['dbscan']['churn_by_cluster'].items():
            print(f"      Cluster {c}: {info['churn_rate']:.1%} churn — {'ALTO RIESGO' if info['churn_rate'] > 0.5 else 'bajo riesgo'}")

    return results


def export_random_forest_json(model, feature_names, output_path):
    """Export scikit-learn RandomForest as JSON for JavaScript inference."""
    n_trees = len(model.estimators_)
    trees_data = []

    for tree in model.estimators_:
        t = tree.tree_
        trees_data.append({
            'children_left': t.children_left.tolist(),
            'children_right': t.children_right.tolist(),
            'feature': t.feature.tolist(),
            'threshold': [round(float(v), 4) for v in t.threshold],
            'value': [[round(float(v), 6) for v in row[0]] for row in t.value],
        })

    export = {
        'model_type': 'RandomForestClassifier',
        'n_estimators': n_trees,
        'n_classes': 2,
        'n_features': len(feature_names),
        'feature_names': feature_names,
        'trees': trees_data,
        'feature_importances': [round(float(v), 4) for v in model.feature_importances_],
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(export, f, ensure_ascii=False)
    print(f"\n  Model exported to {output_path}")
    print(f"  Trees: {n_trees}, Features: {len(feature_names)}")
    return export


def export_gradient_boosting_json(model, feature_names, output_path):
    """Export scikit-learn GradientBoosting as JSON."""
    n_estimators = model.n_estimators_
    trees_data = []
    init_value = model.init_.prior if hasattr(model.init_, 'prior') else 0.0

    for tree in model.estimators_[:, 0]:
        t = tree.tree_
        trees_data.append({
            'children_left': t.children_left.tolist(),
            'children_right': t.children_right.tolist(),
            'feature': t.feature.tolist(),
            'threshold': [round(float(v), 4) for v in t.threshold],
            'value': [[round(float(v), 6) for v in row[0]] for row in t.value],
        })

    export = {
        'model_type': 'GradientBoostingClassifier',
        'n_estimators': n_estimators,
        'n_classes': 2,
        'n_features': len(feature_names),
        'feature_names': feature_names,
        'learning_rate': model.learning_rate,
        'init_value': round(float(init_value), 6),
        'trees': trees_data,
        'feature_importances': [round(float(v), 4) for v in model.feature_importances_],
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(export, f, ensure_ascii=False)
    print(f"\n  Model exported to {output_path}")
    return export


def main():
    print("=" * 80)
    print("  PUKU PUKU CRM — ML Churn Prediction Pipeline")
    print("=" * 80)

    # ── 1. Generate data ────────────────────────────────────
    print("\n[1/7] Generating synthetic customer data...")
    n_customers = 8000
    data = generate_customer_data(n_customers)
    print(f"  Generated {len(data)} customers")

    # ── 2. Feature engineering ───────────────────────────────
    print("\n[2/7] Engineering 31 features...")
    df = engineer_features(data)
    print(f"  Feature matrix: {df.shape[0]} rows x {df.shape[1]} cols")
    print(f"  Features: {[c for c in df.columns if c != 'is_churn']}")

    # ── 3. Inject realistic noise ────────────────────────────
    print("\n[3/7] Injecting realistic noise (nulls + outliers)...")
    df = inject_noise(df, null_pct=0.03, outlier_pct=0.02)

    churn_rate = df['is_churn'].mean()
    print(f"  Churn rate: {churn_rate:.1%} ({int(df['is_churn'].sum())}/{len(df)})")

    # ── 4. Preprocessing (imputation + scaling + split) ─────
    print("\n[4/7] Preprocessing pipeline...")
    feature_cols = [c for c in df.columns if c != 'is_churn']
    X = df[feature_cols]
    y = df['is_churn'].values

    # Impute nulls
    print("  Imputing nulls with median...")
    imputer = SimpleImputer(strategy='median')
    X_imputed = imputer.fit_transform(X)
    print(f"  Nulls after imputation: {np.isnan(X_imputed).sum()}")

    # Scale + split
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imputed)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.25, stratify=y, random_state=SEED
    )
    print(f"  Train: {len(X_train)}, Test: {len(X_test)} (stratified)")

    # ── 5. Classification with GridSearchCV ──────────────────
    print(f"\n{'='*80}")
    print(f"  SUPERVISED CLASSIFICATION")
    print(f"{'='*80}")
    print("\n[5/7] Training 12 models with GridSearchCV (SVM, KNN)...")
    results, best, X_train_bal, X_test_bal, scaler_fitted = train_with_gridsearch(
        pd.DataFrame(X_train, columns=feature_cols),
        pd.DataFrame(X_test, columns=feature_cols),
        y_train, y_test, feature_cols
    )

    best_name, best_model_obj, best_scaler, best_metrics = best
    print(f"\n  *** BEST MODEL: {best_name}")
    print(f"     Accuracy:  {best_metrics['accuracy']:.4f}")
    print(f"     Precision: {best_metrics['precision']:.4f}")
    print(f"     Recall:    {best_metrics['recall']:.4f}")
    print(f"     F1:        {best_metrics['f1']:.4f}")
    print(f"     ROC-AUC:   {best_metrics['roc_auc']:.4f}")

    # ── 6. Threshold calibration ────────────────────────────
    print(f"\n{'='*80}")
    print(f"  THRESHOLD CALIBRATION")
    print(f"{'='*80}")
    print("\n[6/7] Optimizing decision threshold...")
    threshold_info = calibrate_threshold(best_model_obj, X_test, y_test)

    # Cross-validation on best model
    print(f"\n  [Cross-Validation] 5-fold CV on best model...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    cv_scores = cross_val_score(best_model_obj, X_train, y_train, cv=cv, scoring='roc_auc')
    print(f"    Mean CV ROC-AUC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Target check
    final_auc = best_metrics['roc_auc']
    final_acc = best_metrics['accuracy']
    target_acc_ok = final_acc >= 0.80
    target_auc_ok = final_auc >= 0.85
    print(f"\n{'='*80}")
    print(f"  TARGET CHECK: Accuracy >= 80%? {'YES ✓' if target_acc_ok else 'NO ✗'}")
    print(f"  TARGET CHECK: ROC-AUC >= 0.85? {'YES ✓' if target_auc_ok else 'NO ✗'}")
    print(f"  Final Accuracy: {final_acc:.2%} | ROC-AUC: {final_auc:.4f}")
    print(f"{'='*80}")

    # ── 7. Clustering (unsupervised) ────────────────────────
    print(f"\n{'='*80}")
    print(f"  UNSUPERVISED CLUSTERING")
    print(f"{'='*80}")
    print("\n[7/7] Running K-Means + DBSCAN...")
    clustering_results = run_clustering(X_scaled, feature_cols, y)

    # ── Export model ────────────────────────────────────────
    print(f"\n{'='*80}")
    print(f"  EXPORTING")
    print(f"{'='*80}")
    print("\nExporting model for JavaScript inference...")

    # Refit on full data
    X_full_scaled = X_scaled
    y_full = y

    if 'RandomForest' in best_name:
        model_json_path = OUTPUT_DIR / 'model.json'
        if hasattr(best_model_obj, 'estimators_'):
            export_random_forest_json(best_model_obj, feature_cols, model_json_path)
        else:
            rf_export = RandomForestClassifier(
                n_estimators=200, max_depth=15, min_samples_leaf=5,
                class_weight='balanced', random_state=SEED, n_jobs=-1
            )
            rf_export.fit(X_full_scaled, y_full)
            model_json_path = OUTPUT_DIR / 'model.json'
            export_random_forest_json(rf_export, feature_cols, model_json_path)
    else:
        print(f"  {best_name} → fallback to RandomForest for JS export")
        rf_export = RandomForestClassifier(
            n_estimators=200, max_depth=15, min_samples_leaf=5,
            class_weight='balanced', random_state=SEED, n_jobs=-1
        )
        rf_export.fit(X_full_scaled, y_full)
        model_json_path = OUTPUT_DIR / 'model.json'
        export_random_forest_json(rf_export, feature_cols, model_json_path)

    # Save scaler + pipeline
    pipeline_path = OUTPUT_DIR / 'pipeline.pkl'
    joblib.dump({'model': best_model_obj, 'scaler': best_scaler, 'features': feature_cols}, pipeline_path)
    scaler_path = OUTPUT_DIR / 'scaler.pkl'
    joblib.dump(best_scaler, scaler_path)
    print(f"  Pipeline saved to {pipeline_path}")

    # Save feature names
    with open(OUTPUT_DIR / 'features.json', 'w', encoding='utf-8') as f:
        json.dump({
            'feature_names': feature_cols,
            'churn_rate': float(churn_rate),
        }, f, ensure_ascii=False)

    # Save model comparison CSV
    results_df = pd.DataFrame(results).sort_values('roc_auc', ascending=False)
    results_df.to_csv(OUTPUT_DIR / 'model_comparison.csv', index=False)
    print(f"\n  Full comparison saved to model_comparison.csv")
    print(results_df.to_string(index=False))

    # ── Build summary ────────────────────────────────────────
    summary = {
        'status': 'completed',
        'timestamp': datetime.now().isoformat(),
        'best_model': best_name,
        'metrics': best_metrics,
        'threshold_calibration': threshold_info,
        'targets_met': {
            'accuracy_80pct': target_acc_ok,
            'roc_auc_085': target_auc_ok,
        },
        'n_customers': n_customers,
        'n_features': len(feature_cols),
        'churn_rate': round(float(churn_rate), 4),
        'model_path': str(model_json_path),
        'comparison': results,
        'clustering': clustering_results,
    }

    result_path = OUTPUT_DIR / 'results.json'
    with open(result_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    print(f"\n  Results saved to {result_path}")

    if args.json:
        print(json.dumps(summary, ensure_ascii=False))

    print(f"\n{'='*80}")
    print(f"  PIPELINE COMPLETE")
    print(f"{'='*80}")

    return best_name, best_metrics


if __name__ == '__main__':
    main()
