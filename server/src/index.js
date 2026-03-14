import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authenticateToken } from './middleware/auth.js';
import { apiRateLimiter, aiRateLimiter } from './middleware/rateLimiter.js';
import { initScheduler, loadSchedules } from './services/scheduler.js';

import authRoutes from './routes/auth.js';
import connectorRoutes from './routes/connectors.js';
import clientRoutes from './routes/clients.js';
import templateRoutes from './routes/templates.js';
import scheduleRoutes from './routes/schedules.js';
import runRoutes from './routes/runs.js';
import aiRoutes from './routes/ai.js';
import settingsRoutes from './routes/settings.js';
import userRoutes from './routes/users.js';
import integrationRoutes from './routes/integrations.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Public routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() });
});

// Protected routes
app.use('/api/connectors', authenticateToken, apiRateLimiter, connectorRoutes);
app.use('/api/clients', authenticateToken, apiRateLimiter, clientRoutes);
app.use('/api/templates', authenticateToken, apiRateLimiter, templateRoutes);
app.use('/api/schedules', authenticateToken, apiRateLimiter, scheduleRoutes);
app.use('/api/runs', authenticateToken, apiRateLimiter, runRoutes);
app.use('/api/ai', authenticateToken, aiRateLimiter, aiRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/users', authenticateToken, apiRateLimiter, userRoutes);
app.use('/api/integrations', authenticateToken, apiRateLimiter, integrationRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

// Start server
app.listen(PORT, async () => {
  console.log(`NexusMSP server running on port ${PORT}`);

  // Initialize scheduler
  try {
    initScheduler();
    await loadSchedules();
  } catch (err) {
    console.error('Scheduler init failed (Redis may not be available):', err.message);
  }
});

export default app;
