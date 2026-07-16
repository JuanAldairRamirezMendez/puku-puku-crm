#!/usr/bin/env python3
"""
Puku Puku CRM — Demo Interactiva de Predicción de Churn
========================================================
Uso:
  python demo_interactiva.py                        # Demo automática con 5 perfiles
  python demo_interactiva.py --interactivo          # Ingreso manual de datos
  python demo_interactiva.py --quick 5 25 WHATSAPP  # Rápido: frecuencia ticket canal
"""

import json, sys, os, warnings, subprocess, argparse, io
warnings.filterwarnings('ignore')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from pathlib import Path
from datetime import datetime

import joblib
import numpy as np

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / 'output'
PIPELINE_PATH = OUTPUT_DIR / 'pipeline.pkl'
RESULTS_PATH = OUTPUT_DIR / 'results.json'

CANALES = ['PRESENCIAL', 'WHATSAPP', 'INSTAGRAM', 'RAPPI', 'PEDIDOSYA']
SEPARADOR = "=" * 78


# ── 1. Asegurar modelo entrenado ─────────────────────────────────────────────

def asegurar_modelo():
    if not PIPELINE_PATH.exists() or not RESULTS_PATH.exists():
        print("  Modelo no encontrado. Ejecutando entrenamiento...")
        subprocess.run([sys.executable, str(BASE_DIR / 'train.py'), '--json'],
                       cwd=BASE_DIR.parent.parent, check=True)
    return joblib.load(PIPELINE_PATH)

def cargar_resultados():
    with open(RESULTS_PATH, encoding='utf-8') as f:
        return json.load(f)


# ── 2. Feature engineering (mismo orden que train.py) ────────────────────────

def engineer_simple(frecuencia, ticket, canal, producto=""):
    canal_onehot = {f'canal_{c}': 0 for c in ['WhatsApp', 'Instagram', 'Rappi', 'PedidosYa', 'Presencial']}
    c = canal.upper().replace('Á', 'A').replace('É', 'E').replace('Í', 'I').replace('Ó', 'O').replace('Ú', 'U')
    if c == 'WHATSAPP': canal_onehot['canal_WhatsApp'] = 1
    elif c == 'INSTAGRAM': canal_onehot['canal_Instagram'] = 1
    elif c == 'RAPPI': canal_onehot['canal_Rappi'] = 1
    elif c == 'PEDIDOSYA': canal_onehot['canal_PedidosYa'] = 1
    else: canal_onehot['canal_Presencial'] = 1

    return np.array([[
        float(30 if frecuencia == 0 else max(1, 15 - frecuencia)),
        float(frecuencia),
        float(frecuencia / max(1, frecuencia * 2)),
        float(frecuencia / max(1, frecuencia / 2)),
        float(min(frecuencia, 30)),
        float(min(frecuencia, 90)),
        float(ticket),
        float(ticket * frecuencia),
        float(ticket * 1.3),
        float(ticket * 0.7),
        0.0,
        float(ticket),
        float(ticket),
        0.0,
        float(min(1, 1 / 5)),
        0.0, 0.0, 0.0, 0.0,
        float(max(1, frecuencia * 7)),
        7.0, 5.0, 14.0, 0.5, 0.2, 0.1,
        canal_onehot['canal_WhatsApp'],
        canal_onehot['canal_Instagram'],
        canal_onehot['canal_Rappi'],
        canal_onehot['canal_PedidosYa'],
        canal_onehot['canal_Presencial'],
    ]])


# ── 3. Predicción con interpretación de negocio ──────────────────────────────

def predecir_y_mostrar(model, scaler, features, nombre, frecuencia, ticket, canal, producto=""):
    X = engineer_simple(frecuencia, ticket, canal, producto)
    X_scaled = scaler.transform(X) if scaler else X
    proba = model.predict_proba(X_scaled)[0]
    pred = int(model.predict(X_scaled)[0])

    p_churn = proba[1]
    p_activo = proba[0]

    if p_churn >= 0.7:
        nivel = "ALTO"
        riesgo = "\u26a0\ufe0f  ALTO RIESGO DE ABANDONO"
        interpretacion = (
            f"    {nombre} presenta alta probabilidad de abandono ({p_churn:.1%}).\n"
            f"    Acci\u00f3n recomendada: Contacto prioritario v\u00eda {canal.title()} con una oferta "
            f"personalizada (descuento fidelidad + encuesta de satisfacci\u00f3n).\n"
            f"    Si no se interviene, es muy probable que el cliente deje de comprar en los pr\u00f3ximos 30 d\u00edas."
        )
    elif p_churn >= 0.4:
        nivel = "MEDIO"
        riesgo = "\U0001f7e1  RIESGO MODERADO"
        interpretacion = (
            f"    {nombre} muestra signos de riesgo moderado ({p_churn:.1%}).\n"
            f"    Acci\u00f3n recomendada: Enviar recordatorio v\u00eda {canal.title()} con promoci\u00f3n "
            f"especial y monitorear frecuencia de visita pr\u00f3ximas 2 semanas.\n"
            f"    Podr\u00eda estar evaluando a la competencia o insatisfecho con el servicio."
        )
    else:
        nivel = "BAJO"
        riesgo = "\U0001f7e2  CLIENTE ACTIVO / BAJO RIESGO"
        interpretacion = (
            f"    {nombre} es un cliente activo con baja probabilidad de abandono ({p_churn:.1%}).\n"
            f"    Acci\u00f3n recomendada: Mantener la experiencia actual. Ofrecer programa "
            f"de referidos para captar nuevos clientes.\n"
            f"    Cliente fiel con potencial de convertirse en embajador de marca."
        )

    print(f"\n{SEPARADOR}")
    print(f"  CLIENTE: {nombre}")
    print(f"{SEPARADOR}")
    print(f"  \U0001f4ca  Datos del cliente:")
    print(f"     Frecuencia de visita:  {frecuencia} veces")
    print(f"     Ticket promedio:       S/ {ticket:.2f}")
    print(f"     Canal principal:       {canal}")
    if producto:
        print(f"     Producto favorito:     {producto}")
    print(f"\n  \U0001f52e  Predicci\u00f3n del modelo (SVM RBF + GridSearchCV):")
    print(f"     Probabilidad activo:   {p_activo:.1%}")
    print(f"     Probabilidad churn:    {p_churn:.1%}")
    print(f"     Estado:                {riesgo}")
    print(f"\n  \U0001f4a1  Interpretaci\u00f3n para la MiPYME:")
    print(interpretacion)

    return {"nombre": nombre, "churn": pred, "probabilidad": round(float(p_churn), 4), "nivel": nivel}


# ── 4. Mostrar métricas globales ─────────────────────────────────────────────

def mostrar_metricas_globales(resultados):
    m = resultados['metrics']
    tc = resultados['threshold_calibration']
    print(f"\n{SEPARADOR}")
    print(f"  M\u00c9TRICAS GLOBALES DEL MODELO ({resultados['best_model']})")
    print(f"{SEPARADOR}")
    print(f"  Accuracy:  {m['accuracy']:.2%}  (meta: \u2265 80% -> {'\u2705' if resultados['targets_met']['accuracy_80pct'] else '\u274c'})")
    print(f"  Precision: {m['precision']:.2%}")
    print(f"  Recall:    {m['recall']:.2%}")
    print(f"  F1-Score:  {m['f1']:.2%}")
    print(f"  AUC-ROC:   {m['roc_auc']:.4f}  (meta: \u2265 0.85 -> {'\u2705' if resultados['targets_met']['roc_auc_085'] else '\u274c'})")
    print(f"  Umbral \u00f3ptimo: {tc['optimal_threshold']} (F1: {tc['default_f1']:.2%} -> {tc['optimal_f1']:.2%})")
    print(f"  Tasa de churn global: {resultados['churn_rate']:.1%}")

    print(f"\n  Top 5 modelos por AUC-ROC:")
    for i, model in enumerate(sorted(resultados['comparison'], key=lambda x: x['roc_auc'], reverse=True)[:5]):
        print(f"    {i+1}. {model['model']:25s}  AUC={model['roc_auc']:.4f}  F1={model['f1']:.4f}")


def mostrar_clustering(resultados):
    c = resultados['clustering']
    print(f"\n{SEPARADOR}")
    print(f"  CLUSTERING NO SUPERVISADO (Sesi\u00f3n S16)")
    print(f"{SEPARADOR}")

    km = c['kmeans']
    print(f"  K-Means (k={km['optimal_k']}):")
    print(f"    Silhouette: {km['silhouette_score']:.4f}  Davies-Bouldin: {km['davies_bouldin']:.4f}")
    for cluster, info in sorted(km['churn_by_cluster'].items()):
        riesgo = "ALTO" if info['churn_rate'] > 0.5 else "bajo"
        print(f"    Cluster {cluster}: {info['churn_rate']:.0%} churn ({info['count']} clientes) — {riesgo} riesgo")

    if 'dbscan' in c and c['dbscan'].get('silhouette_score'):
        db = c['dbscan']
        print(f"\n  DBSCAN (eps={db['eps']}, {db['n_clusters']} clusters):")
        print(f"    Silhouette: {db['silhouette_score']:.4f}  Davies-Bouldin: {db['davies_bouldin']:.4f}")
        for cluster, info in sorted(db['churn_by_cluster'].items()):
            riesgo = "ALTO" if info['churn_rate'] > 0.5 else "bajo"
            print(f"    Cluster {cluster}: {info['churn_rate']:.0%} churn ({info['count']} clientes) — {riesgo} riesgo")


# ── 5. Perfiles de demostración ──────────────────────────────────────────────

PERFILES_DEMO = [
    ("Lucia Morales",     20, 35.00, "WHATSAPP",   "Cafe Latte",    "Cliente fiel — compra semanalmente, ticket alto"),
    ("Mateo Castillo",     5, 22.50, "PRESENCIAL", "Croissant",     "Cliente regular — visita cada 2 semanas"),
    ("Camila Rivera",      2, 15.00, "INSTAGRAM",  "Matcha Latte",  "Cliente ocasional — compra poco y espaciado"),
    ("Santiago Vargas",    1, 12.00, "RAPPI",      "Sandwich",      "Cliente nuevo — 1 sola compra, ticket bajo"),
    ("Valentina Lopez",    3,  8.50, "PEDIDOSYA",  "Cafe Americano","Cliente en riesgo — frecuencia baja, ticket muy bajo"),
]


# ── 6. Main ──────────────────────────────────────────────────────────────────

def demo_automatica(model, scaler, feature_names, resultados):
    print(f"\n{'#' * 78}")
    print(f"#  DEMO AUTOM\u00c1TICA — 5 PERFILES DE CLIENTES")
    print(f"{'#' * 78}")

    for nombre, freq, ticket, canal, prod, desc in PERFILES_DEMO:
        predecir_y_mostrar(model, scaler, feature_names, nombre, freq, ticket, canal, prod)

    mostrar_metricas_globales(resultados)
    mostrar_clustering(resultados)

    print(f"\n{SEPARADOR}")
    print(f"  \u00bfC\u00f3mo interpretar estos resultados para la MiPYME?")
    print(f"{SEPARADOR}")
    print(f"  - Los clientes con probabilidad \u2265 40% requieren atenci\u00f3n inmediata.")
    print(f"  - El equipo de fidelizaci\u00f3n debe contactar por el canal preferido del cliente.")
    print(f"  - El modelo SVM RBF (AUC={resultados['metrics']['roc_auc']:.2f}) permite priorizar ")
    print(f"    esfuerzos de retenci\u00f3n seg\u00fan el nivel de riesgo.")
    print(f"  - El clustering identifica segmentos con diferentes patrones de abandono.")
    print(f"  - Recomendaci\u00f3n: reentrenar cada 3 meses con datos actualizados.")


def demo_interactiva(model, scaler, feature_names, resultados):
    print(f"\n{'#' * 78}")
    print(f"#  MODO INTERACTIVO — Ingrese los datos del cliente")
    print(f"{'#' * 78}")

    try:
        nombre = input("\n  Nombre del cliente: ").strip() or "Cliente Ejemplo"
        freq = int(input("  Frecuencia de visita (veces en 3 meses): ").strip() or "5")
        ticket = float(input("  Ticket promedio (S/): ").strip() or "25")
        print("  Canales disponibles: PRESENCIAL, WHATSAPP, INSTAGRAM, RAPPI, PEDIDOSYA")
        canal = input("  Canal principal: ").strip().upper() or "WHATSAPP"
        producto = input("  Producto favorito: ").strip() or "Cafe Latte"
    except (ValueError, EOFError):
        print("  Entrada inv\u00e1lida. Usando valores por defecto.")
        nombre, freq, ticket, canal, producto = "Cliente Ejemplo", 5, 25.0, "WHATSAPP", "Cafe Latte"

    predecir_y_mostrar(model, scaler, feature_names, nombre, freq, ticket, canal, producto)
    mostrar_metricas_globales(resultados)
    mostrar_clustering(resultados)


def demo_quick(model, scaler, feature_names, resultados, args):
    print(f"\n{'#' * 78}")
    print(f"#  PREDICCI\u00d3N R\u00c1PIDA")
    print(f"{'#' * 78}")
    freq = int(args[0]) if len(args) > 0 else 5
    ticket = float(args[1]) if len(args) > 1 else 25.0
    canal = args[2].upper() if len(args) > 2 else "WHATSAPP"
    nombre = " ".join(args[3:]) if len(args) > 3 else "Cliente R\u00e1pido"
    predecir_y_mostrar(model, scaler, feature_names, nombre, freq, ticket, canal)
    print(f"\n  Ejecute sin argumentos para la demo completa de 5 perfiles.")


def main():
    parser = argparse.ArgumentParser(description="Demo interactiva de churn")
    parser.add_argument('--interactivo', '-i', action='store_true', help='Modo interactivo (ingreso manual)')
    parser.add_argument('--quick', '-q', nargs='*', help='Predicci\u00f3n r\u00e1pida: frecuencia ticket canal [nombre]')
    args = parser.parse_args()

    print(f"\n{SEPARADOR}")
    print(f"  PUKU PUKU CRM — Sistema de Predicci\u00f3n de Churn")
    print(f"  Demo funcional para sustentaci\u00f3n de Proyecto Final")
    print(f"  Fecha: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print(f"{SEPARADOR}")

    print("\n  \U0001f504  Cargando modelo entrenado...")
    artefacto = asegurar_modelo()
    model = artefacto['model']
    scaler = artefacto['scaler']
    feature_names = artefacto['features']

    resultados = cargar_resultados()
    print(f"  Modelo: {resultados['best_model']} | AUC-ROC: {resultados['metrics']['roc_auc']:.4f} | Clientes: {resultados['n_customers']}")

    if args.quick is not None:
        demo_quick(model, scaler, feature_names, resultados, args.quick)
    elif args.interactivo:
        demo_interactiva(model, scaler, feature_names, resultados)
    else:
        demo_automatica(model, scaler, feature_names, resultados)

    print(f"\n{SEPARADOR}")
    print(f"  Demo finalizada. Para m\u00e1s informaci\u00f3n:")
    print(f"    python demo_interactiva.py --interactivo")
    print(f"{SEPARADOR}\n")


if __name__ == '__main__':
    main()
