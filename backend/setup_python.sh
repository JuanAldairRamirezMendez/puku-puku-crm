#!/usr/bin/env bash
# Instala dependencias Python para ML si no están ya instaladas.
# Se ejecuta desde start (sh setup_python.sh && node src/server.js)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APF3_REQ="$SCRIPT_DIR/../apf3/requirements.txt"
ML_REQ="$SCRIPT_DIR/ml/requirements.txt"

PYTHON=""
command -v python3 &>/dev/null && PYTHON=python3
command -v python &>/dev/null && PYTHON=python
[ -z "$PYTHON" ] && exit 0

PIP="$PYTHON -m pip"

# Si numpy ya está instalado, salir rápido (skip)
$PYTHON -c "import numpy; import joblib" 2>/dev/null && exit 0

echo "[setup_python] Instalando dependencias Python para ML..."

install_req() {
  local f="$1"
  [ ! -f "$f" ] && return 0
  $PIP install --break-system-packages -r "$f" 2>/dev/null && return 0
  $PIP install --user -r "$f" 2>/dev/null && return 0
  $PIP install -r "$f" 2>/dev/null
}

install_req "$APF3_REQ"
install_req "$ML_REQ"

echo "[setup_python] Done."
