#!/usr/bin/env bash
# Instala dependencias Python para ML. Corre en postinstall de npm.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APF3_REQ="$SCRIPT_DIR/../apf3/requirements.txt"
ML_REQ="$SCRIPT_DIR/ml/requirements.txt"

# Detectar python
PYTHON=""
if command -v python3 &>/dev/null; then
  PYTHON=python3
elif command -v python &>/dev/null; then
  PYTHON=python
fi

if [ -z "$PYTHON" ]; then
  echo "[setup_python] No se encontró python. Saltando instalación de dependencias ML."
  exit 0
fi

PIP="$PYTHON -m pip"

echo "[setup_python] Usando: $PYTHON ($($PYTHON --version 2>&1))"

# Probar con --break-system-packages (pip >= 23.0), luego --user, luego sin flags
install_req() {
  local req_file="$1"
  if [ ! -f "$req_file" ]; then
    echo "[setup_python] Requeriments no encontrado: $req_file"
    return 0
  fi
  echo "[setup_python] Instalando: $req_file"
  $PIP install --break-system-packages -r "$req_file" 2>/dev/null && return 0
  $PIP install --user -r "$req_file" 2>/dev/null && return 0
  $PIP install -r "$req_file" 2>/dev/null && return 0
  echo "[setup_python] WARNING: no se pudieron instalar $req_file"
  return 0
}

install_req "$APF3_REQ"
install_req "$ML_REQ"

echo "[setup_python] Done."
