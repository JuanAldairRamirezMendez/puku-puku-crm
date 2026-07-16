const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const PYTHON = process.env.PYTHON_PATH || 'python';
const TRAIN_SCRIPT = path.join(__dirname, '../../ml/train.py');
const OUTPUT_DIR = path.join(__dirname, '../../ml/output');
const RESULTS_FILE = path.join(OUTPUT_DIR, 'results.json');

let entrenando = false;

async function entrenar(req, res, next) {
  if (entrenando) {
    return res.status(409).json({ error: 'Ya hay un entrenamiento en curso' });
  }

  entrenando = true;
  const lines = [];

  try {
    const startTime = Date.now();

    await new Promise((resolve, reject) => {
      const child = spawn(PYTHON, [TRAIN_SCRIPT, '--json'], {
        cwd: path.join(__dirname, '../..'),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.stdout.on('data', (data) => {
        const text = data.toString('utf-8');
        lines.push(text);
        process.stdout.write(text);
      });

      child.stderr.on('data', (data) => {
        const text = data.toString('utf-8');
        lines.push(text);
        process.stderr.write(text);
      });

      child.on('close', (code) => {
        entrenando = false;
        if (code !== 0) {
          reject(new Error(`train.py termino con codigo ${code}`));
        } else {
          resolve();
        }
      });

      child.on('error', (err) => {
        entrenando = false;
        reject(err);
      });
    });

    const log = lines.join('\n');
    let results = null;
    try {
      if (fs.existsSync(RESULTS_FILE)) {
        results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
      }
    } catch {}

    // Persist experiment run
    if (results) {
      try {
        await prisma.experimentRun.create({
          data: {
            status: 'completed',
            bestModel: results.best_model,
            nCustomers: results.n_customers,
            nFeatures: results.n_features,
            churnRate: results.churn_rate,
            accuracy: results.metrics?.accuracy,
            precision: results.metrics?.precision,
            recall: results.metrics?.recall,
            f1: results.metrics?.f1,
            rocAuc: results.metrics?.roc_auc,
            targetsMet: results.targets_met?.accuracy_80pct && results.targets_met?.roc_auc_085,
            metrics: JSON.stringify(results.comparison),
            log: log.slice(0, 10000),
            modelPath: results.model_path,
            completedAt: new Date(),
          },
        });
      } catch (dbErr) {
        console.error('Error al persistir experiment run:', dbErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Entrenamiento completado',
      results,
      log: log.slice(0, 5000),
    });
  } catch (err) {
    entrenando = false;

    // Persist failed run
    try {
      await prisma.experimentRun.create({
        data: {
          status: 'failed',
          log: lines.join('\n').slice(0, 10000),
          completedAt: new Date(),
        },
      });
    } catch {}

    const log = lines.join('\n');
    return res.status(500).json({
      error: `Error en entrenamiento: ${err.message}`,
      log: log.slice(0, 5000),
    });
  }
}

function status(req, res) {
  let results = null;
  let modelInfo = null;
  let scalerInfo = null;

  try {
    if (fs.existsSync(RESULTS_FILE)) {
      results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
    }
  } catch {}

  try {
    const modelPath = path.join(OUTPUT_DIR, 'model.json');
    if (fs.existsSync(modelPath)) {
      const m = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
      modelInfo = {
        model_type: m.model_type,
        n_estimators: m.n_estimators,
        n_features: m.n_features,
        feature_names: m.feature_names,
      };
    }
  } catch {}

  try {
    const scalerPath = path.join(OUTPUT_DIR, 'scaler.json');
    if (fs.existsSync(scalerPath)) {
      const s = JSON.parse(fs.readFileSync(scalerPath, 'utf-8'));
      scalerInfo = {
        n_features: s.mean?.length || 0,
        feature_names: s.feature_names,
      };
    }
  } catch {}

  return res.json({
    entrenando,
    last_trained: results?.timestamp || null,
    best_model: results?.best_model || modelInfo?.model_type || null,
    metrics: results?.metrics || null,
    targets_met: results?.targets_met || null,
    model: modelInfo,
    scaler: scalerInfo,
    output_dir: OUTPUT_DIR,
  });
}

module.exports = { entrenar, status };
