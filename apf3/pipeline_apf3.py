"""
=============================================================================
APF3 -- Pipeline de Machine Learning: Churn y Segmentación
Puku Puku CRM * Innovación y Transformación Digital * UTP 2026-1
=============================================================================

Uso:
    python pipeline_apf3.py                          # desde API (backend corriendo)
    python pipeline_apf3.py --csv dataset_apf3.csv    # desde archivo local

Dependencias: pip install -r requirements.txt
Random state fijo: 42 (reproducible)
=============================================================================
"""

import argparse
import io
import os
import sys
import warnings
from pathlib import Path

import joblib

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import requests
import seaborn as sns
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    RocCurveDisplay,
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

warnings.filterwarnings("ignore")
RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

MODEL_DIR = Path(__file__).parent / "model"
MODEL_DIR.mkdir(exist_ok=True)

API_URL = "http://localhost:4000/api/reportes/export-apf3.csv"
CREDENTIALS = {"email": "admin@pukupuku.pe", "password": "puku2026"}
AUTH_URL = "http://localhost:4000/api/auth/login"


# =============================================================================
# 1. CARGA DEL DATASET
# =============================================================================
def cargar_dataset(ruta_csv=None):
    if ruta_csv and Path(ruta_csv).exists():
        print(f"[1] Cargando dataset desde archivo local: {ruta_csv}")
        df = pd.read_csv(ruta_csv)
    else:
        print(f"[1] Cargando dataset desde API: {API_URL}")
        try:
            auth_resp = requests.post(AUTH_URL, json=CREDENTIALS, timeout=10)
            auth_resp.raise_for_status()
            token = auth_resp.json()["token"]
            headers = {"Authorization": f"Bearer {token}"}
            resp = requests.get(API_URL, headers=headers, timeout=15)
            resp.raise_for_status()
            df = pd.read_csv(io.StringIO(resp.text))
        except requests.exceptions.ConnectionError:
            print("  [WARN] API no disponible. Usando dataset simulado.")
            df = _generar_dataset_simulado()
    print(f"  Filas: {df.shape[0]}, Columnas: {df.shape[1]}")
    print(f"  Columnas: {list(df.columns)}")
    return df


def _generar_dataset_simulado(random_state=RANDOM_STATE):
    """Dataset sintético de respaldo cuando no hay API ni archivo."""
    rng = np.random.default_rng(random_state)
    n = 200
    canales = rng.choice(["PRESENCIAL", "WHATSAPP", "INSTAGRAM", "RAPPI", "PEDIDOSYA"], size=n)
    productos = rng.choice([
        "Flat white sin azúcar", "Cappuccino clásico", "Latte caramel",
        "Matcha latte", "Americano", "Mocha", "Chai latte",
    ], size=n)
    frec = rng.poisson(lam=4, size=n).clip(0, 20)
    ticket = np.round(rng.exponential(scale=16, size=n).clip(3, 60), 2)
    prob_churn = 1 / (1 + np.exp(-0.3 * (frec - 6)))
    churn_bin = (rng.random(n) < prob_churn).astype(int)
    churn_score = np.round(np.clip(prob_churn + rng.normal(0, 0.08, n), 0, 1), 4)

    return pd.DataFrame({
        "nombre": [f"Cliente_{i}" for i in range(n)],
        "frecuencia_visita": frec,
        "ticket_promedio_soles": ticket,
        "canal_origen": canales,
        "producto_favorito": productos,
        "churn_label": churn_bin,
        "churn_score": churn_score,
    })


# =============================================================================
# 2. ANÁLISIS EXPLORATORIO (EDA)
# =============================================================================
def eda(df):
    print("\n" + "=" * 60)
    print("2. ANÁLISIS EXPLORATORIO DE DATOS (EDA)")
    print("=" * 60)

    print(f"\n--- Tipos y nulos ---")
    nulls = df.isnull().sum()
    if nulls.sum() > 0:
        print(nulls[nulls > 0])
    else:
        print("  Sin valores nulos.")

    print(f"\n--- Estadísticas descriptivas (numéricas) ---")
    num_cols = df.select_dtypes(include=[np.number]).columns
    print(df[num_cols].describe().round(3).to_string())

    print(f"\n--- Distribución target: churn_label ---")
    print(df["churn_label"].value_counts().to_string())
    churn_rate = df["churn_label"].mean() * 100
    print(f"  Churn rate: {churn_rate:.1f}%")

    print(f"\n--- Distribución por canal ---")
    print(df["canal_origen"].value_counts().to_string())

    print(f"\n--- Productos favoritos (top 10) ---")
    print(df["producto_favorito"].value_counts().head(10).to_string())

    # ---- Gráficos ----
    fig, axes = plt.subplots(2, 3, figsize=(14, 8))
    fig.suptitle("EDA -- Puku Puku CRM | APF3", fontsize=14, fontweight="bold")

    df["churn_label"].value_counts().plot(
        ax=axes[0, 0], kind="bar", color=["#4f7942", "#c1502e"], edgecolor="white"
    )
    axes[0, 0].set_title("Distribución de churn_label")
    axes[0, 0].set_xticklabels(["Activo (0)", "Churn (1)"], rotation=0)

    df["canal_origen"].value_counts().plot(
        ax=axes[0, 1], kind="bar", color="#5b3a21", edgecolor="white"
    )
    axes[0, 1].set_title("Clientes por canal de origen")
    axes[0, 1].tick_params(axis="x", rotation=30)

    df["producto_favorito"].value_counts().head(10).plot(
        ax=axes[0, 2], kind="barh", color="#c98a2e", edgecolor="white"
    )
    axes[0, 2].set_title("Top 10 productos favoritos")

    axes[1, 0].hist(df["frecuencia_visita"], bins=15, color="#4f7942", edgecolor="white")
    axes[1, 0].set_title("Distribución de frecuencia_visita")
    axes[1, 0].set_xlabel("Visitas")

    axes[1, 1].hist(df["ticket_promedio_soles"], bins=15, color="#2e6b8a", edgecolor="white")
    axes[1, 1].set_title("Distribución de ticket_promedio_soles")
    axes[1, 1].set_xlabel("Soles")

    churn_0 = df[df["churn_label"] == 0]["frecuencia_visita"]
    churn_1 = df[df["churn_label"] == 1]["frecuencia_visita"]
    axes[1, 2].hist(
        [churn_0, churn_1], bins=12, label=["Activo", "Churn"],
        color=["#4f7942", "#c1502e"], edgecolor="white", alpha=0.7,
    )
    axes[1, 2].set_title("Frecuencia por churn_label")
    axes[1, 2].set_xlabel("Visitas")
    axes[1, 2].legend()

    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "eda.png", dpi=150)
    print(f"\n  Gráfico guardado: {OUTPUT_DIR / 'eda.png'}")
    plt.close()

    # Mapa de calor correlaciones
    corr_df = df[num_cols].copy()
    if "churn_score" in corr_df.columns:
        corr_df = corr_df.drop(columns=["churn_score"])
    if "churn_label" in corr_df.columns:
        plt.figure(figsize=(6, 5))
        sns.heatmap(corr_df.corr(), annot=True, cmap="BrBG", vmin=-1, vmax=1, center=0)
        plt.title("Matriz de correlación")
        plt.tight_layout()
        plt.savefig(OUTPUT_DIR / "correlacion.png", dpi=150)
        print(f"  Correlación guardada: {OUTPUT_DIR / 'correlacion.png'}")
        plt.close()


# =============================================================================
# 3. PREPROCESAMIENTO
# =============================================================================
def preprocesar(df):
    print("\n" + "=" * 60)
    print("3. PREPROCESAMIENTO")
    print("=" * 60)

    df = df.copy()

    # Codificar variables categóricas
    le_canal = LabelEncoder()
    df["canal_origen_enc"] = le_canal.fit_transform(df["canal_origen"])

    le_producto = LabelEncoder()
    df["producto_favorito_enc"] = le_producto.fit_transform(df["producto_favorito"].fillna("N/A"))

    # Feature derivada: gasto_total_mensual_estimado
    df["gasto_total_mensual_estimado"] = df["frecuencia_visita"] * df["ticket_promedio_soles"]

    # Features numéricas + codificadas
    feature_cols = ["frecuencia_visita", "ticket_promedio_soles", "gasto_total_mensual_estimado", "canal_origen_enc", "producto_favorito_enc"]
    X = df[feature_cols].values
    y = df["churn_label"].values

    print(f"  Features ({len(feature_cols)}): {feature_cols}")
    print(f"  X shape: {X.shape}, y shape: {y.shape}")
    print(f"  Clases: {np.bincount(y)}")

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.30, random_state=RANDOM_STATE, stratify=y
    )
    print(f"  Train: {X_train.shape[0]}, Test: {X_test.shape[0]}")

    # Escalar
    scaler = StandardScaler()
    X_train_sc = scaler.fit_transform(X_train)
    X_test_sc = scaler.transform(X_test)

    return df, X_train_sc, X_test_sc, y_train, y_test, scaler, le_canal, le_producto, feature_cols


# =============================================================================
# 4. MODELADO -- CLASIFICACIÓN SUPERVISADA
# =============================================================================
def modelar(X_train, X_test, y_train, y_test, feature_cols):
    print("\n" + "=" * 60)
    print("4. MODELADO -- CLASIFICACIÓN SUPERVISADA")
    print("=" * 60)

    modelos = {
        "Regresión Logística": LogisticRegression(
            random_state=RANDOM_STATE, max_iter=1000, class_weight="balanced"
        ),
        "Random Forest": RandomForestClassifier(
            random_state=RANDOM_STATE, n_estimators=200, max_depth=8, class_weight="balanced"
        ),
    }

    resultados = []

    for nombre, modelo in modelos.items():
        print(f"\n  >> {nombre}")
        modelo.fit(X_train, y_train)
        y_pred = modelo.predict(X_test)

        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        try:
            y_prob = modelo.predict_proba(X_test)[:, 1]
            auc = roc_auc_score(y_test, y_prob)
        except Exception:
            auc = 0.0

        print(f"    Accuracy:  {acc:.4f}")
        print(f"    Precision: {prec:.4f}")
        print(f"    Recall:    {rec:.4f}")
        print(f"    F1-score:  {f1:.4f}")
        print(f"    AUC-ROC:   {auc:.4f}")
        print(f"    Matriz de confusión:\n      {confusion_matrix(y_test, y_pred)}")

        resultados.append({"modelo": nombre, "accuracy": acc, "precision": prec,
                           "recall": rec, "f1": f1, "auc": auc})

        # Curva ROC
        RocCurveDisplay.from_estimator(modelo, X_test, y_test)
        plt.title(f"Curva ROC -- {nombre}")
        plt.tight_layout()
        plt.savefig(OUTPUT_DIR / f"roc_{nombre.replace(' ', '_').lower()}.png", dpi=150)
        plt.close()

    # Tabla comparativa
    df_result = pd.DataFrame(resultados).set_index("modelo")
    print(f"\n  --- Comparación de modelos ---")
    print(df_result.round(4).to_string())
    df_result.round(4).to_csv(OUTPUT_DIR / "comparacion_modelos.csv")
    print(f"  Guardado: {OUTPUT_DIR / 'comparacion_modelos.csv'}")

    # Feature importance del Random Forest
    rf = modelos["Random Forest"]
    importancias = pd.DataFrame({
        "feature": feature_cols,
        "importancia": rf.feature_importances_,
    }).sort_values("importancia", ascending=False)

    print(f"\n  --- Importancia de features (Random Forest) ---")
    print(importancias.to_string(index=False))

    plt.figure(figsize=(7, 4))
    sns.barplot(data=importancias, x="importancia", y="feature", palette="BrBG")
    plt.title("Importancia de features -- Random Forest")
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "feature_importance.png", dpi=150)
    print(f"  Guardado: {OUTPUT_DIR / 'feature_importance.png'}")
    plt.close()

    return df_result, modelos


# =============================================================================
# 5. SEGMENTACIÓN NO SUPERVISADA (K-MEANS)
# =============================================================================
def segmentar(df, feature_cols):
    print("\n" + "=" * 60)
    print("5. SEGMENTACIÓN NO SUPERVISADA -- K-MEANS")
    print("=" * 60)

    X_seg = df[feature_cols].values
    scaler = StandardScaler()
    X_seg_sc = scaler.fit_transform(X_seg)

    # Evaluar codo de inercia para elegir k
    inercias = []
    k_range = range(2, 9)
    for k in k_range:
        km = KMeans(n_clusters=k, random_state=RANDOM_STATE, n_init=10)
        km.fit(X_seg_sc)
        inercias.append(km.inertia_)

    plt.figure(figsize=(6, 4))
    plt.plot(k_range, inercias, marker="o", color="#c1502e")
    plt.xlabel("k (clusters)")
    plt.ylabel("Inercia")
    plt.title("Método del codo -- K-Means")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "codo_kmeans.png", dpi=150)
    plt.close()
    print(f"  Gráfico de codo guardado: {OUTPUT_DIR / 'codo_kmeans.png'}")

    # Aplicar k=3
    k = 3
    km = KMeans(n_clusters=k, random_state=RANDOM_STATE, n_init=10)
    km.fit(X_seg_sc)
    df["segmento"] = km.labels_

    print(f"\n  K={k} -- Perfiles de segmentos:")
    for seg in range(k):
        sub = df[df["segmento"] == seg]
        print(f"\n  >> Segmento {seg} ({len(sub)} clientes, {len(sub)/len(df)*100:.1f}%)")
        print(f"      Frecuencia prom.:  {sub['frecuencia_visita'].mean():.2f}")
        print(f"      Ticket prom.:      S/{sub['ticket_promedio_soles'].mean():.2f}")
        print(f"      Churn rate:        {sub['churn_label'].mean()*100:.1f}%")
        print(f"      Churn score prom.: {sub['churn_score'].mean():.4f}")
        print(f"      Canal predominante: {sub['canal_origen'].mode().iloc[0]}")

    segmento_cols = ["nombre", "frecuencia_visita", "ticket_promedio_soles",
                     "canal_origen", "producto_favorito", "churn_label", "churn_score", "segmento"]
    df[segmento_cols].to_csv(OUTPUT_DIR / "segmentos.csv", index=False)
    print(f"\n  Dataset con segmentos guardado: {OUTPUT_DIR / 'segmentos.csv'}")

    # Visualizar segmentos (scatter de frecuencia vs ticket)
    plt.figure(figsize=(8, 5))
    scatter = plt.scatter(
        df["frecuencia_visita"], df["ticket_promedio_soles"],
        c=df["segmento"], cmap="Set2", edgecolor="black", alpha=0.7, s=60,
    )
    plt.xlabel("Frecuencia de visitas")
    plt.ylabel("Ticket promedio (S/)")
    plt.title("Segmentos K-Means (k=3)")
    plt.legend(handles=scatter.legend_elements()[0],
               labels=[f"Segmento {i}" for i in range(k)],
               title="Cluster")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "segmentos_scatter.png", dpi=150)
    plt.close()
    print(f"  Scatter guardado: {OUTPUT_DIR / 'segmentos_scatter.png'}")


# =============================================================================
# 6. INFORME FINAL
# =============================================================================
def informe(df, df_result):
    print("\n" + "=" * 60)
    print("6. INFORME DE REPRODUCIBILIDAD")
    print("=" * 60)

    lines = [
        "=" * 60,
        "INFORME DE REPRODUCIBILIDAD -- APF3 PUKU PUKU CRM",
        f"Fecha: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M')}",
        f"Random state: {RANDOM_STATE}",
        "=" * 60,
        "",
        f"Dataset: {df.shape[0]} filas, {df.shape[1]} columnas",
        f"Churn rate: {df['churn_label'].mean()*100:.1f}%",
        f"Churn score promedio: {df['churn_score'].mean():.4f}",
        "",
        "Resultados de clasificación:",
        df_result.round(4).to_string(),
        "",
        "Archivos generados en output/:",
        "  eda.png                  -- Distribuciones exploratorias",
        "  correlacion.png          -- Matriz de correlación",
        "  roc_regresión_logística.png -- Curva ROC (LogisticRegression)",
        "  roc_random_forest.png      -- Curva ROC (Random Forest)",
        "  comparacion_modelos.csv  -- Métricas de ambos modelos",
        "  feature_importance.png   -- Importancia de variables (RF)",
        "  codo_kmeans.png          -- Método del codo para K-Means",
        "  segmentos.csv            -- Dataset con columna segmento asignada",
        "  segmentos_scatter.png    -- Visualización de clusters",
        "",
        "Nota: Este pipeline es reproducible ejecutando:",
        f"  python {Path(__file__).name}",
        "con el backend corriendo en localhost:4000 o un CSV local.",
        "",
    ]

    reporte = "\n".join(lines)
    print("\n" + reporte)

    with open(OUTPUT_DIR / "informe_reproducibilidad.txt", "w", encoding="utf-8") as f:
        f.write(reporte)
    print(f"  Informe guardado: {OUTPUT_DIR / 'informe_reproducibilidad.txt'}")


# =============================================================================
# 7. EXPORTAR MODELO A PRODUCCIÓN
# =============================================================================
def exportar_modelo(modelos, scaler, le_canal, le_producto, feature_cols, df_result):
    print("\n" + "=" * 60)
    print("7. EXPORTAR MODELO A PRODUCCIÓN")
    print("=" * 60)

    modelo_rec = modelos["Regresión Logística"]
    rf = modelos["Random Forest"]

    artifacts = {
        "logistic_regression": modelo_rec,
        "random_forest": rf,
        "scaler": scaler,
        "label_encoder_canal": le_canal,
        "label_encoder_producto": le_producto,
        "feature_cols": feature_cols,
        "random_state": RANDOM_STATE,
        "metrics": df_result.to_dict(),
    }

    path = MODEL_DIR / "modelo_churn.pkl"
    joblib.dump(artifacts, path)
    print(f"  Modelo exportado: {path} ({path.stat().st_size / 1024:.1f} KB)")

    # Guardar encoders como JSON para Node.js
    import json
    encoders = {
        "canal_origen": {str(i): c for i, c in enumerate(le_canal.classes_)},
        "producto_favorito": {str(i): c for i, c in enumerate(le_producto.classes_)},
    }
    with open(MODEL_DIR / "encoders.json", "w", encoding="utf-8") as f:
        json.dump(encoders, f, ensure_ascii=False, indent=2)
    print(f"  Encoders exportados: {MODEL_DIR / 'encoders.json'}")


# =============================================================================
# MAIN
# =============================================================================
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pipeline APF3 -- Churn y Segmentación")
    parser.add_argument("--csv", help="Ruta a archivo CSV local (opcional)")
    parser.add_argument("--export", action="store_true", help="Exportar modelo entrenado a producción")
    args = parser.parse_args()

    print("=" * 60)
    print("PUKU PUKU CRM -- Pipeline de Machine Learning (APF3)")
    print("=" * 60)
    print(f"Random state: {RANDOM_STATE}")

    df = cargar_dataset(args.csv)
    eda(df)
    df, X_train, X_test, y_train, y_test, scaler, le_canal, le_producto, feature_cols = preprocesar(df)
    df_result, modelos = modelar(X_train, X_test, y_train, y_test, feature_cols)
    segmentar(df, feature_cols[:2])  # frecuencia + ticket para scatter 2D

    if args.export:
        exportar_modelo(modelos, scaler, le_canal, le_producto, feature_cols, df_result)

    informe(df, df_result)

    print("\n[OK] Pipeline completado. Outputs en:", OUTPUT_DIR)
