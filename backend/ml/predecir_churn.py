"""
Script de predicción — carga modelo entrenado por backend/ml/train.py
Uso desde Node.js: python backend/ml/predecir_churn.py <json_input>

Input:  { frecuencia_visita, ticket_promedio_soles, canal_origen, producto_favorito }
Output: { churn_prediccion, probabilidad_churn, ... }
"""
import json, sys, warnings
warnings.filterwarnings('ignore')
from pathlib import Path
import joblib
import numpy as np

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / 'output'
PIPELINE_PATH = OUTPUT_DIR / 'pipeline.pkl'
MODEL_JSON_PATH = OUTPUT_DIR / 'model.json'
SCALER_JSON_PATH = OUTPUT_DIR / 'scaler.json'

CANALES = ['PRESENCIAL', 'WHATSAPP', 'INSTAGRAM', 'RAPPI', 'PEDIDOSYA']

def cargar_modelo():
    if PIPELINE_PATH.exists():
        art = joblib.load(PIPELINE_PATH)
        return art['model'], art['scaler'], art['features']
    if MODEL_JSON_PATH.exists() and SCALER_JSON_PATH.exists():
        return None, None, None  # fallback: use JS-side inference
    return None, None, None

def engineer_simple(frecuencia, ticket, canal, producto):
    """Build the 31-feature vector from the 5 simple inputs.
       Missing interaction-level features are set to sensible defaults."""
    canal_onehot = {f'canal_{c}': 0 for c in ['WhatsApp', 'Instagram', 'Rappi', 'PedidosYa', 'Presencial']}
    c = canal.upper().replace('Á', 'A').replace('É', 'E').replace('Í', 'I').replace('Ó', 'O').replace('Ú', 'U')
    if c == 'WHATSAPP': canal_onehot['canal_WhatsApp'] = 1
    elif c == 'INSTAGRAM': canal_onehot['canal_Instagram'] = 1
    elif c == 'RAPPI': canal_onehot['canal_Rappi'] = 1
    elif c == 'PEDIDOSYA': canal_onehot['canal_PedidosYa'] = 1
    else: canal_onehot['canal_Presencial'] = 1

    return [
        float(30 if frecuencia == 0 else max(1, 15 - frecuencia)),  # recency_dias
        float(frecuencia),                                          # freq_total
        float(frecuencia / max(1, frecuencia * 2)),                  # freq_semanal (approx)
        float(frecuencia / max(1, frecuencia / 2)),                  # freq_mensual (approx)
        float(min(frecuencia, 30)),                                 # interacciones_ultimo_mes
        float(min(frecuencia, 90)),                                 # interacciones_ultimo_trim
        float(ticket),                                              # ticket_promedio
        float(ticket * frecuencia),                                 # ticket_total
        float(ticket * 1.3),                                        # ticket_max (approx)
        float(ticket * 0.7),                                        # ticket_min (approx)
        0.0,                                                        # ticket_std
        float(ticket),                                              # ticket_ultimo
        float(ticket),                                              # ticket_ultimo_mes
        0.0,                                                        # ticket_trend
        float(min(1, len(set([canal])) / 5)),                       # diversidad_canal
        0.0,                                                        # pct_insatisfecho
        0.0,                                                        # pct_satisfecho
        0.0,                                                        # pct_insatisfecho_reciente
        0.0,                                                        # sat_trend
        float(max(1, frecuencia * 7)),                              # tenure_dias
        7.0,                                                        # gap_mean
        5.0,                                                        # gap_std
        14.0,                                                       # gap_max
        0.5,                                                        # regularidad
        0.2,                                                        # weekend_ratio
        0.1,                                                        # night_ratio
        canal_onehot['canal_WhatsApp'],
        canal_onehot['canal_Instagram'],
        canal_onehot['canal_Rappi'],
        canal_onehot['canal_PedidosYa'],
        canal_onehot['canal_Presencial'],
    ]

def predecir(input_data):
    model, scaler, feature_names = cargar_modelo()
    if model is None:
        return {
            "churn_prediccion": 0,
            "churn_etiqueta": "ACTIVO",
            "probabilidad_churn": 0,
            "probabilidad_activo": 1,
            "nota": "Modelo no entrenado. Ejecuta entrenar primero.",
        }

    frecuencia = float(input_data.get("frecuencia_visita", 0))
    ticket = float(input_data.get("ticket_promedio_soles", 0))
    canal = input_data.get("canal_origen", "PRESENCIAL")
    producto = input_data.get("producto_favorito", "N/A")

    features = engineer_simple(frecuencia, ticket, canal, producto)
    X = np.array([features])

    if scaler:
        try:
            X_scaled = scaler.transform(X)
        except Exception:
            X_scaled = X
    else:
        X_scaled = X

    proba = model.predict_proba(X_scaled)[0]
    pred = int(model.predict(X_scaled)[0])

    return {
        "churn_prediccion": pred,
        "churn_etiqueta": "RIESGO_ABANDONO" if pred == 1 else "ACTIVO",
        "probabilidad_churn": round(float(proba[1]), 4),
        "probabilidad_activo": round(float(proba[0]), 4),
        "variables": {
            "frecuencia_visita": frecuencia,
            "ticket_promedio_soles": ticket,
            "canal_origen": canal,
            "producto_favorito": producto,
        },
        "features_31": [round(f, 4) for f in features],
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
