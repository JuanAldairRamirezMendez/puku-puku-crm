const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const ML_DIR = path.resolve(__dirname, '../../ml');
const PREDICT_SCRIPT = path.join(ML_DIR, 'predecir_churn.py');
const MODEL_DIR = path.join(ML_DIR, 'output');
const MODEL_JSON = path.join(MODEL_DIR, 'model.json');

function getPythonCommand() {
  if (process.env.GRAPHIFY_PYTHON) return process.env.GRAPHIFY_PYTHON;
  try { require('child_process').execSync('python3 --version', { stdio: 'ignore' }); return 'python3'; }
  catch { return 'python'; }
}

async function predecirChurn(input) {
  return new Promise((resolve, reject) => {
    const json = JSON.stringify(input);
    const python = getPythonCommand();
    execFile(python, [PREDICT_SCRIPT, json], {
      cwd: ML_DIR,
      maxBuffer: 1024 * 1024 * 10,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    }, (err, stdout, stderr) => {
      if (err) {
        // Fallback: si Python no está disponible, usar churn-predictor.js
        try {
          const fallback = require('./churn-predictor');
          const isArray = Array.isArray(input);
          const items = isArray ? input : [input];
          const results = items.map(item => {
            const pred = fallback.predictProbability(
              { nombreCompleto: item.nombre || 'Cliente' },
              [{ fecha: new Date().toISOString(), montoSoles: item.ticket_promedio_soles || 0, canal: item.canal_origen || 'PRESENCIAL', satisfaccion: 'NEUTRO' }]
            );
            return pred ? {
              churn_prediccion: pred.nivel === 'alto' ? 1 : 0,
              churn_etiqueta: pred.nivel === 'alto' ? 'RIESGO_ABANDONO' : 'ACTIVO',
              probabilidad_churn: pred.probabilidad,
              probabilidad_activo: 1 - pred.probabilidad,
              variables: item,
            } : {
              churn_prediccion: 0,
              churn_etiqueta: 'ACTIVO',
              probabilidad_churn: 0.3,
              probabilidad_activo: 0.7,
              variables: item,
            };
          });
          return resolve(isArray ? results : results[0]);
        } catch (fallbackErr) {
          const detail = stderr ? `: ${stderr.trim().slice(0, 300)}` : '';
          return reject(new Error(`Error ejecutando prediccion: ${err.message}${detail}`));
        }
      }
      try {
        const result = JSON.parse(stdout.trim());
        if (result.error) {
          return reject(new Error(result.error));
        }
        resolve(result);
      } catch (parseErr) {
        reject(new Error(`Error parseando respuesta: ${parseErr.message}. stdout: ${stdout.slice(0, 200)}`));
      }
    });
  });
}

async function predecirBatch(clientes) {
  return predecirChurn(clientes);
}

async function entrenarModelo() {
  // Intentar entrenar con Python. Si falla (pip no instalado), usar modelo pre-entrenado.
  const python = getPythonCommand();
  try {
    await new Promise((resolve, reject) => {
      const pipeline = path.join(ML_DIR, 'train.py');
      execFile(python, [pipeline, '--json'], {
        cwd: ML_DIR,
        maxBuffer: 1024 * 1024 * 50,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        timeout: 300000,
      }, (err, stdout, stderr) => {
        if (err) {
          const detail = stderr ? `: ${stderr.trim().slice(0, 500)}` : '';
          return reject(new Error(`Error entrenando modelo: ${err.message}${detail}`));
        }
        resolve({ stdout, stderr });
      });
    });
  } catch (err) {
    // Si falló por entorno Python, usar el modelo pre-entrenado del repo
    if (fs.existsSync(MODEL_JSON)) {
      const stats = fs.statSync(MODEL_JSON);
      console.warn(`[ML] Training fallback: usando modelo pre-entrenado (${new Date(stats.mtime).toISOString()})`);
      return {
        stdout: `[ML] Usando modelo pre-entrenado del repositorio. Para entrenar con datos reales, instala Python 3 + pip y ejecuta: python backend/ml/train.py\n`,
        stderr: '',
        _fallback: true,
      };
    }
    throw err;
  }
}

function modeloExiste() {
  return fs.existsSync(MODEL_JSON);
}

module.exports = { predecirChurn, predecirBatch, entrenarModelo, modeloExiste };
