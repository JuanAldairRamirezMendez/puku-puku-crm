const { execFile } = require('child_process');
const path = require('path');

const SCRIPT_DIR = path.resolve(__dirname, '../../../apf3');
const PREDICT_SCRIPT = path.join(SCRIPT_DIR, 'predecir_churn.py');
const MODEL_DIR = path.join(SCRIPT_DIR, 'model');

function getPythonCommand() {
  if (process.env.GRAPHIFY_PYTHON) return process.env.GRAPHIFY_PYTHON;
  // Render/Linux usa python3; Windows usa python
  try { require('child_process').execSync('python3 --version', { stdio: 'ignore' }); return 'python3'; }
  catch { return 'python'; }
}

async function predecirChurn(input) {
  return new Promise((resolve, reject) => {
    const json = JSON.stringify(input);
    const python = getPythonCommand();
    execFile(python, [PREDICT_SCRIPT, json], {
      cwd: SCRIPT_DIR,
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
    const pipeline = path.join(SCRIPT_DIR, 'pipeline_apf3.py');
    execFile(python, [pipeline, '--export'], {
      cwd: SCRIPT_DIR,
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
  return fs.existsSync(path.join(MODEL_DIR, 'modelo_churn.pkl'));
}

module.exports = { predecirChurn, predecirBatch, entrenarModelo, modeloExiste };
