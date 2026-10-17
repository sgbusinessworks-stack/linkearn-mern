import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import programRoutes from './routes/programs.js';
import dashboardRoutes from './routes/dashboard.js';
import conversionRoutes from './routes/conversions.js';
import payoutRoutes from './routes/payouts.js';
import trackingRoutes from './routes/tracking.js';
import webhookRoutes from './routes/webhooks.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'LinkEarn API' }));
app.use('/api/auth', authRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/conversions', conversionRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/track', trackingRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use((req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
app.use((err, _req, res, _next) => {
  if (err.code === 11000) return res.status(409).json({ message: 'This record already exists. Check for a duplicate order or application.' });
  console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong on the server.' });
});

const port = Number(process.env.PORT) || 5000;
connectDB().then(() => app.listen(port, () => console.log(`LinkEarn API listening on ${port}`))).catch(err => { console.error(err.message); process.exit(1); });
