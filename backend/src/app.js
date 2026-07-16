const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.routes');
const clientesRoutes = require('./routes/clientes.routes');
const interaccionesRoutes = require('./routes/interacciones.routes');
const reportesRoutes = require('./routes/reportes.routes');
const auditRoutes = require('./routes/audit.routes');
const experimentsRoutes = require('./routes/experiments.routes');
const featureStoreRoutes = require('./routes/feature-store.routes');
const abTestRoutes = require('./routes/ab-test.routes');
const { health, healthDetailed } = require('./controllers/health.controller');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim());
const isProduction = process.env.NODE_ENV === 'production';
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (isProduction && !corsOrigins.includes(origin)) {
      return cb(new Error('Not allowed by CORS'));
    }
    return cb(null, true);
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

app.get('/api/health', health);
app.get('/api/health/detailed', healthDetailed);

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api', interaccionesRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/experimentos', experimentsRoutes);
app.use('/api/feature-store', featureStoreRoutes);
app.use('/api/ab-test', abTestRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
