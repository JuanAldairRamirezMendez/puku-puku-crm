import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import interaccionesRoutes from './routes/interacciones.routes.js';
import reportesRoutes from './routes/reportes.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', servicio: 'Puku Puku CRM API', timestamp: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api', interaccionesRoutes);
app.use('/api/reportes', reportesRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
