const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const clientesRoutes = require('./routes/clientes.routes');
const interaccionesRoutes = require('./routes/interacciones.routes');
const reportesRoutes = require('./routes/reportes.routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', servicio: 'Puku Puku CRM API', timestamp: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api', interaccionesRoutes);
app.use('/api/reportes', reportesRoutes);

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
