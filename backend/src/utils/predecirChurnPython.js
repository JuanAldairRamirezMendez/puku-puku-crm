const { execFile } = require('child_process');
const path = require('path');

const ML_DIR = path.resolve(__dirname, '../../ml');
const PREDICT_SCRIPT = path.join(ML_DIR, 'predecir_churn.py');
const MODEL_DIR = path.join(ML_DIR, 'output');

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
        const detail = stderr ? `: ${stderr.trim().slice(0, 300)}` : '';
        return reject(new Error(`Error ejecutando prediccion: ${err.message}${detail}`));
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
  return new Promise((resolve, reject) => {
    const python = getPythonCommand();
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
}

function modeloExiste() {
  const fs = require('fs');
  return fs.existsSync(path.join(MODEL_DIR, 'pipeline.pkl')) ||
         fs.existsSync(path.join(MODEL_DIR, 'model.json'));
}

module.exports = { predecirChurn, predecirBatch, entrenarModelo, modeloExiste };
