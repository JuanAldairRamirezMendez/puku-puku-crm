const { execFile, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ML_DIR = path.resolve(__dirname, '../../ml');
const APF3_DIR = path.resolve(__dirname, '../../../apf3');
const PREDICT_SCRIPT = path.join(ML_DIR, 'predecir_churn.py');
const MODEL_DIR = path.join(ML_DIR, 'output');
const MODEL_JSON = path.join(MODEL_DIR, 'model.json');
const ML_REQS = path.join(ML_DIR, 'requirements.txt');
const APF3_REQS = path.join(APF3_DIR, 'requirements.txt');

function getPythonCommand() {
  if (process.env.GRAPHIFY_PYTHON) return process.env.GRAPHIFY_PYTHON;
  try { execSync('python3 --version', { stdio: 'ignore' }); return 'python3'; }
  catch { return 'python'; }
}

async function pipInstall(python, reqFile, label) {
  return new Promise((resolve) => {
    execFile(python, ['-m', 'pip', 'install', '--break-system-packages', '-r', reqFile], {
      timeout: 120000,
      env: { ...process.env, PIP_ROOT_USER_ACTION: 'ignore' },
    }, (err) => {
      if (!err) return resolve(true);
      execFile(python, ['-m', 'pip', 'install', '--user', '-r', reqFile], {
        timeout: 120000,
      }, (err2) => resolve(!err2));
    });
  });
}

async function ensureDeps(python) {
  // Fast check: try importing everything train.py needs
  const check = await new Promise((resolve) => {
    execFile(python, ['-c', 'import numpy,pandas,sklearn,xgboost,lightgbm,joblib'], (err) => resolve(!err));
  });
  if (check) return true;
  console.log('[ML] Installing Python dependencies...');
  const apf3Ok = await pipInstall(python, APF3_REQS, 'APF3');
  const mlOk = await pipInstall(python, ML_REQS, 'ML');
  const ok = apf3Ok || mlOk;
  if (ok) console.log('[ML] Dependencies installed');
  else console.error('[ML] Failed to install Python dependencies');
  return ok;
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
  const python = getPythonCommand();
  const pipeline = path.join(ML_DIR, 'train.py');

  // Try training directly first
  const tryTrain = () => new Promise((resolve, reject) => {
    execFile(python, [pipeline, '--json'], {
      cwd: ML_DIR,
      maxBuffer: 1024 * 1024 * 50,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      timeout: 300000,
    }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr, _fallback: false });
    });
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await tryTrain();
    } catch (err) {
      if (attempt === 0) {
        console.log(`[ML] Training failed (${err.message.slice(0, 80)}). Installing deps and retrying...`);
        const depsOk = await ensureDeps(python);
        if (!depsOk) break;
        // retry
      } else {
        break;
      }
    }
  }

  // Fallback: pre-trained model
  if (fs.existsSync(MODEL_JSON)) {
    const mtime = fs.statSync(MODEL_JSON).mtime;
    console.warn(`[ML] Using pre-trained model from ${mtime.toISOString()}`);
    return {
      stdout: '',
      stderr: '',
      _fallback: true,
      _fallback_mtime: mtime.toISOString(),
    };
  }

  throw new Error('Python no disponible y no hay modelo pre-entrenado. Instala Python 3 + pip.');
}

function modeloExiste() {
  return fs.existsSync(MODEL_JSON);
}

module.exports = { predecirChurn, predecirBatch, entrenarModelo, modeloExiste };
