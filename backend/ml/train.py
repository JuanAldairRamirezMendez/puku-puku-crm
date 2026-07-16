#!/usr/bin/env python3
"""
Puku Puku CRM — ML Churn Prediction Pipeline
============================================
1. Generate synthetic training data (8000+ samples) based on seed patterns
2. Engineer 20+ features from raw interaction data
3. Train & evaluate 10 ML models
4. Select best model (target: >=80% accuracy / >=0.85 ROC-AUC)
5. Export model as JSON for JavaScript inference

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
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    roc_curve, precision_recall_curve
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
import xgboost as xgb
import lightgbm as lgb
import joblib

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

# =============================================================
# 1. DATA GENERATION — simulate realistic customer patterns
# =============================================================

CANALES = ['PRESENCIAL', 'WHATSAPP', 'INSTAGRAM', 'RAPPI', 'PEDIDOSYA']
SATISFACCION = ['SATISFECHO', 'NEUTRO', 'INSATISFECHO']
PRODUCTOS = ['Cafe Latte', 'Cafe Americano', 'Cappuccino', 'Mocha', 'Matcha Latte',
             'Chai Latte', 'Expresso Doble', 'Affogato', 'Cold Brew', 'Flat White',
             'Croissant', 'Alfajor', 'Cheesecake', 'Brownie', 'Sandwich']

# Peruvian names pool
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

def generate_customer_data(n_customers=5000):
    """Generate synthetic customer data with realistic patterns and known churn labels."""
    records = []
    for _ in range(n_customers):
        # Customer profile determines behavior
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
        else:  # riesgo_alto
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

        # Apply churn window: if customer is "churned", last interaction was >30 days ago
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


# =============================================================
# 2. FEATURE ENGINEERING
# =============================================================

def engineer_features(records):
    """Extract 20+ features from raw interaction data."""
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
        dias_primera = (ahora - primera_fecha).days
        tenure = max(1, (ultima_fecha - primera_fecha).days)

        gaps = [(fechas[i+1] - fechas[i]).days for i in range(len(fechas)-1)]
        gap_mean = np.mean(gaps) if gaps else 0
        gap_std = np.std(gaps) if gaps else 0
        gap_max = max(gaps) if gaps else 0

        # Recency (days since last interaction)
        recency = min(dias_ultima, 365)

        # Frequency features
        freq_total = n
        freq_semanal = n / max(1, tenure / 7)
        freq_mensual = n / max(1, tenure / 30)
        interacciones_ultimo_mes = sum(1 for f in fechas if (ahora - f).days <= 30)
        interacciones_ultimo_trim = sum(1 for f in fechas if (ahora - f).days <= 90)

        # Monetary features
        ticket_promedio = np.mean(montos) if montos else 0
        ticket_total = sum(montos)
        ticket_max = max(montos) if montos else 0
        ticket_min = min(montos) if montos else 0
        ticket_std = np.std(montos) if len(montos) > 1 else 0
        ticket_ultimo = montos[-1] if montos else 0
        ticket_ultimo_mes = np.mean([m for m, f in zip(montos, fechas)
                                     if (ahora - f).days <= 30]) or 0
        # Ticket trend: slope of last 5 tickets
        if len(montos) >= 5:
            xs = np.arange(len(montos[-5:]))
            ticket_trend = np.polyfit(xs, montos[-5:], 1)[0]
        elif len(montos) >= 2:
            xs = np.arange(len(montos))
            ticket_trend = np.polyfit(xs, montos, 1)[0]
        else:
            ticket_trend = 0

        # Channel diversity
        canales_unicos = len(set(canales))
        diversidad_canal = canales_unicos / len(CANALES)
        canal_mas_usado = Counter(canales).most_common(1)[0][0] if canales else 'PRESENCIAL'

        # Satisfaction features
        n_insatisfecho = sum(1 for s in satisfacciones if s == 'INSATISFECHO')
        n_satisfecho = sum(1 for s in satisfacciones if s == 'SATISFECHO')
        pct_insatisfecho = n_insatisfecho / n if n else 0
        pct_satisfecho = n_satisfecho / n if n else 0
        # Satisfaction in last 90 days
        recientes_sat = [s for s, f in zip(satisfacciones, fechas)
                        if (ahora - f).days <= 90]
        pct_insatisfecho_reciente = (
            sum(1 for s in recientes_sat if s == 'INSATISFECHO') / len(recientes_sat)
            if recientes_sat else 0
        )

        # Satisfaction trend
        if len(satisfacciones) >= 3:
            sat_val = {'INSATISFECHO': 0, 'NEUTRO': 0.5, 'SATISFECHO': 1}
            sat_vals = [sat_val[s] for s in satisfacciones[-5:]]
            sat_trend = sat_vals[-1] - sat_vals[0]
        else:
            sat_trend = 0

        # Recency of first interaction
        antiguedad_dias = max(1, (ultima_fecha - primera_fecha).days)

        # Regularity (inverse of gap std)
        regularidad = 1 / (1 + gap_std) if gaps else 0.5

        # Weekend ratio
        weekend_count = sum(1 for f in fechas if f.weekday() >= 5)
        weekend_ratio = weekend_count / n if n else 0

        # Night interactions (after 8pm)
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
            # One-hot: canal principal
            'canal_WhatsApp': int(canal_mas_usado == 'WHATSAPP'),
            'canal_Instagram': int(canal_mas_usado == 'INSTAGRAM'),
            'canal_Rappi': int(canal_mas_usado == 'RAPPI'),
            'canal_PedidosYa': int(canal_mas_usado == 'PEDIDOSYA'),
            'canal_Presencial': int(canal_mas_usado == 'PRESENCIAL'),
            # Target
            'is_churn': r['is_churn'],
        }
        rows.append(row)

    return pd.DataFrame(rows)


# =============================================================
# 3. MODEL TRAINING & EVALUATION
# =============================================================

def evaluate_model(model, X_test, y_test, name):
    """Evaluate a model and return metrics dict."""
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    metrics = {
        'model': name,
        'accuracy': round(accuracy_score(y_test, y_pred), 4),
        'precision': round(precision_score(y_test, y_pred, zero_division=0), 4),
        'recall': round(recall_score(y_test, y_pred, zero_division=0), 4),
        'f1': round(f1_score(y_test, y_pred, zero_division=0), 4),
        'roc_auc': round(roc_auc_score(y_test, y_prob), 4),
    }
    return metrics


def train_and_evaluate(X_train, X_test, y_train, y_test):
    """Train all models and return comparison."""
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    models = {
        'LogisticRegression': LogisticRegression(
            C=0.1, max_iter=1000, class_weight='balanced', random_state=SEED
        ),
        'DecisionTree': DecisionTreeClassifier(
            max_depth=10, min_samples_leaf=10, class_weight='balanced', random_state=SEED
        ),
        'RandomForest': RandomForestClassifier(
            n_estimators=200, max_depth=15, min_samples_leaf=5,
            class_weight='balanced', random_state=SEED, n_jobs=-1
        ),
        'ExtraTrees': ExtraTreesClassifier(
            n_estimators=200, max_depth=12, min_samples_leaf=5,
            class_weight='balanced', random_state=SEED, n_jobs=-1
        ),
        'GradientBoosting': GradientBoostingClassifier(
            n_estimators=200, max_depth=5, learning_rate=0.1,
            subsample=0.8, random_state=SEED
        ),
        'AdaBoost': AdaBoostClassifier(
            n_estimators=100, learning_rate=0.5, random_state=SEED
        ),
        'XGBoost': xgb.XGBClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.8,
            scale_pos_weight=1.5, random_state=SEED, n_jobs=-1,
            eval_metric='logloss'
        ),
        'LightGBM': lgb.LGBMClassifier(
            n_estimators=200, max_depth=8, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.8,
            class_weight='balanced', random_state=SEED, n_jobs=-1,
            verbose=-1
        ),
        'SVC_RBF': SVC(
            C=1.0, gamma='scale', probability=True,
            class_weight='balanced', random_state=SEED
        ),
        'KNN': KNeighborsClassifier(
            n_neighbors=15, weights='distance', n_jobs=-1
        ),
        'MLP': MLPClassifier(
            hidden_layer_sizes=(64, 32), max_iter=500,
            alpha=0.01, batch_size=64, random_state=SEED, early_stopping=True
        ),
        'NaiveBayes': GaussianNB(),
    }

    # Models that need feature names
    feature_names = X_train.columns.tolist()

    results = []
    best_model = None
    best_score = 0

    print(f"\n{'='*80}")
    print(f"{'MODEL':<25} {'ACC':>8} {'PREC':>8} {'REC':>8} {'F1':>8} {'AUC':>8}")
    print(f"{'='*80}")

    for name, model in models.items():
        try:
            model.fit(X_train_scaled, y_train)
            metrics = evaluate_model(model, X_test_scaled, y_test, name)
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


# =============================================================
# 4. EXPORT MODEL AS JSON FOR JAVASCRIPT INFERENCE
# =============================================================

def export_random_forest_json(model, feature_names, output_path):
    """Export scikit-learn RandomForest as JSON for JavaScript inference."""
    n_trees = len(model.estimators_)
    trees_data = []

    for tree in model.estimators_:
        t = tree.tree_
        n_nodes = t.node_count
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
    print(f"  Model exported to {output_path}")
    print(f"  Trees: {n_trees}, Features: {len(feature_names)}")
    return export


def export_xgboost_json(model, feature_names, output_path):
    """Export XGBoost model as JSON."""
    # Get booster dump
    model.get_booster().feature_names = feature_names
    dump = model.get_booster().get_dump(dump_format='json')
    booster = json.loads(dumps)

    export = {
        'model_type': 'XGBoost',
        'n_estimators': len(dump),
        'n_classes': 2,
        'n_features': len(feature_names),
        'feature_names': feature_names,
        'base_score': float(model.base_score) if hasattr(model, 'base_score') else 0.5,
        'trees': dump,
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(export, f, ensure_ascii=False)
    print(f"  Model exported to {output_path}")
    return export


def export_gradient_boosting_json(model, feature_names, output_path):
    """Export scikit-learn GradientBoosting as JSON for JavaScript inference."""
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
    print(f"  Model exported to {output_path}")
    return export


# =============================================================
# 5. MAIN PIPELINE
# =============================================================

def main():
    print("=" * 80)
    print("  PUKU PUKU CRM — ML Churn Prediction Pipeline")
    print("=" * 80)

    # Generate data
    print("\n[1/5] Generating synthetic customer data...")
    n_customers = 8000
    data = generate_customer_data(n_customers)
    print(f"  Generated {len(data)} customers")

    # Feature engineering
    print("\n[2/5] Engineering features...")
    df = engineer_features(data)
    print(f"  Feature matrix: {df.shape[0]} rows x {df.shape[1]} cols")

    # Check churn distribution
    churn_rate = df['is_churn'].mean()
    print(f"  Churn rate: {churn_rate:.1%} ({df['is_churn'].sum()}/{len(df)})")

    # Fill NaN values
    df = df.fillna(0)

    # Split features/target
    feature_cols = [c for c in df.columns if c != 'is_churn']
    X = df[feature_cols]
    y = df['is_churn'].values

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, stratify=y, random_state=SEED
    )
    print(f"  Train: {len(X_train)}, Test: {len(X_test)}")

    # Train & evaluate all models
    print("\n[3/5] Training and evaluating 11 ML models...")
    results, best, X_train_scaled, X_test_scaled, scaler = train_and_evaluate(
        X_train, X_test, y_train, y_test
    )

    best_name, best_model_obj, best_scaler, best_metrics = best
    print(f"\n  *** BEST MODEL: {best_name}")
    print(f"     Accuracy:  {best_metrics['accuracy']:.4f}")
    print(f"     Precision: {best_metrics['precision']:.4f}")
    print(f"     Recall:    {best_metrics['recall']:.4f}")
    print(f"     F1:        {best_metrics['f1']:.4f}")
    print(f"     ROC-AUC:   {best_metrics['roc_auc']:.4f}")

    # Cross-validation on best model
    print("\n[4/5] Cross-validation on best model...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    cv_scores = cross_val_score(best_model_obj, X_train_scaled, y_train, cv=cv, scoring='roc_auc')
    print(f"  5-Fold CV ROC-AUC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Export model
    print("\n[5/5] Exporting model...")
    feature_names = feature_cols

    # Save scaler
    scaler_path = OUTPUT_DIR / 'scaler.pkl'
    joblib.dump(scaler, scaler_path)
    print(f"  Scaler saved to {scaler_path}")

    # Save feature names
    with open(OUTPUT_DIR / 'features.json', 'w', encoding='utf-8') as f:
        json.dump({
            'feature_names': feature_names,
            'churn_rate': float(churn_rate),
        }, f, ensure_ascii=False)

    # Export model as JSON and pickle
    if 'XGBoost' in best_name:
        model_json_path = OUTPUT_DIR / 'model.json'
        export_xgboost_json(best_model_obj, feature_names, model_json_path)
    elif 'RandomForest' in best_name:
        model_json_path = OUTPUT_DIR / 'model.json'
        export_random_forest_json(best_model_obj, feature_names, model_json_path)
    elif 'GradientBoosting' in best_name:
        model_json_path = OUTPUT_DIR / 'model.json'
        export_gradient_boosting_json(best_model_obj, feature_names, model_json_path)
    else:
        # Fall back to RF anyway (best for JS inference)
        print(f"  {best_name} not directly exportable → falling back to RandomForest")
        rf_fallback = RandomForestClassifier(
            n_estimators=200, max_depth=15, min_samples_leaf=5,
            class_weight='balanced', random_state=SEED, n_jobs=-1
        )
        rf_fallback.fit(X_train_scaled, y_train)
        model_json_path = OUTPUT_DIR / 'model.json'
        export_random_forest_json(rf_fallback, feature_names, model_json_path)

    # Also save full sklearn pipeline
    pipeline_path = OUTPUT_DIR / 'pipeline.pkl'
    joblib.dump({'model': best_model_obj, 'scaler': scaler, 'features': feature_names}, pipeline_path)

    # Save all results
    results_df = pd.DataFrame(results).sort_values('roc_auc', ascending=False)
    results_path = OUTPUT_DIR / 'model_comparison.csv'
    results_df.to_csv(results_path, index=False)
    print(f"\n  Full comparison saved to {results_path}")
    print(results_df.to_string(index=False))

    # Feature importance analysis
    print(f"\n  Top 10 Features (from export):")
    feat_path = OUTPUT_DIR / 'model.json'
    if feat_path.exists():
        with open(feat_path) as f:
            exported = json.load(f)
        if 'feature_importances' in exported:
            fi = sorted(zip(exported['feature_importances'], exported['feature_names']),
                       reverse=True)
            for i, (imp, name) in enumerate(fi[:10], 1):
                print(f"    {i:2d}. {name}: {imp:.4f}")

    # Check target: >=80% accuracy >=0.85 AUC
    final_auc = best_metrics['roc_auc']
    final_acc = best_metrics['accuracy']
    target_acc_ok = final_acc >= 0.80
    target_auc_ok = final_auc >= 0.85
    print(f"\n{'='*80}")
    print(f"  TARGET CHECK: Accuracy >= 80%? {'YES' if target_acc_ok else 'NO - need more tuning'}")
    print(f"  TARGET CHECK: ROC-AUC >= 0.85? {'YES' if target_auc_ok else 'NO - need more tuning'}")
    print(f"  Final Accuracy: {final_acc:.2%} | ROC-AUC: {final_auc:.4f}")
    print(f"{'='*80}")

    summary = {
        'status': 'completed',
        'timestamp': datetime.now().isoformat(),
        'best_model': best_name,
        'metrics': best_metrics,
        'targets_met': {
            'accuracy_80pct': target_acc_ok,
            'roc_auc_085': target_auc_ok,
        },
        'n_customers': n_customers,
        'n_features': len(feature_cols),
        'churn_rate': round(float(churn_rate), 4),
        'model_path': str(model_json_path),
        'comparison': results,
    }

    result_path = OUTPUT_DIR / 'results.json'
    with open(result_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    print(f"\n  Results saved to {result_path}")

    if args.json:
        print(json.dumps(summary, ensure_ascii=False))

    return best_name, best_metrics


if __name__ == '__main__':
    main()
