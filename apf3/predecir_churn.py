"""
Script de predicción — carga modelo serializado y predice churn.
Uso desde Node.js: python predecir_churn.py <json_input>
"""
import json
import sys
from pathlib import Path

import joblib
import numpy as np

MODEL_DIR = Path(__file__).parent / "model"
MODEL_PATH = MODEL_DIR / "modelo_churn.pkl"


def cargar_modelo():
    if not MODEL_PATH.exists():
        print(json.dumps({"error": "Modelo no encontrado. Ejecuta: python pipeline_apf3.py --export"}))
        sys.exit(1)
    return joblib.load(MODEL_PATH)


def predecir(input_data):
    artifacts = cargar_modelo()

    modelo = artifacts["logistic_regression"]
    scaler = artifacts["scaler"]
    le_canal = artifacts["label_encoder_canal"]
    le_producto = artifacts["label_encoder_producto"]
    feature_cols = artifacts["feature_cols"]

    frecuencia = float(input_data.get("frecuencia_visita", 0))
    ticket = float(input_data.get("ticket_promedio_soles", 0))
    canal = input_data.get("canal_origen", "PRESENCIAL")
    producto = input_data.get("producto_favorito", "N/A")

    gasto_mensual = frecuencia * ticket

    try:
        canal_enc = le_canal.transform([canal])[0]
    except ValueError:
        canal_enc = 0

    try:
        prod_enc = le_producto.transform([producto])[0]
    except ValueError:
        prod_enc = 0

    raw = np.array([[frecuencia, ticket, gasto_mensual, canal_enc, prod_enc]])
    X_scaled = scaler.transform(raw)

    proba = modelo.predict_proba(X_scaled)[0]
    pred = int(modelo.predict(X_scaled)[0])

    return {
        "churn_prediccion": pred,
        "churn_etiqueta": "RIESGO_ABANDONO" if pred == 1 else "ACTIVO",
        "probabilidad_churn": round(float(proba[1]), 4),
        "probabilidad_activo": round(float(proba[0]), 4),
        "variables": {
            "frecuencia_visita": frecuencia,
            "ticket_promedio_soles": ticket,
            "gasto_total_mensual_estimado": round(gasto_mensual, 2),
            "canal_origen": canal,
            "producto_favorito": producto,
        },
    }


def predecir_batch(registros):
    resultados = []
    for r in registros:
        try:
            resultados.append(predecir(r))
        except Exception as e:
            resultados.append({"error": str(e), "input": r})
    return resultados


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Se requiere JSON de entrada"}))
        sys.exit(1)

    try:
        entrada = json.loads(sys.argv[1])
    except json.JSONDecodeError:
        print(json.dumps({"error": "JSON inválido"}))
        sys.exit(1)

    if isinstance(entrada, list):
        output = predecir_batch(entrada)
    else:
        output = predecir(entrada)

    print(json.dumps(output, ensure_ascii=False))
