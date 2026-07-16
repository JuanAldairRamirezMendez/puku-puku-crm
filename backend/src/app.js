const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.routes');
const clientesRoutes = require('./routes/clientes.routes');
const interaccionesRoutes = require('./routes/interacciones.routes');
const reportesRoutes = require('./routes/reportes.routes');
const auditRoutes = require('./routes/audit.routes');
const { health, healthDetailed } = require('./controllers/health.controller');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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

app.use(notFound);
app.use(errorHandler);

module.exports = app;
