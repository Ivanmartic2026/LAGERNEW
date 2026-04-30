/**
 * Lager IM Server
 * Express.js backend replacing Base44 BaaS
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { prisma } from './lib/db.js';
import { setWss } from './services/autoTransitionService.js';

import { authRouter } from './routes/auth.js';
import { entitiesRouter } from './routes/entities.js';
import { functionsRouter } from './routes/functions.js';
import { uploadRouter } from './routes/upload.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const app = express();
const server = createServer(app);
export { prisma };

// ── WebSocket server ──
const wss = new WebSocketServer({ server, path: '/ws' });
setWss(wss);

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  ws.on('close', () => console.log('[WS] Client disconnected'));
  ws.on('error', (err) => console.error('[WS] Error:', err.message));
});

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── Middleware ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: (origin, callback) => {
    // Tillåt alla localhost-portar (dev-läge)
    if (!origin || origin.startsWith('http://localhost:')) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} ej tillåten`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Health check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Static files (downloaded assets) ──
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

// ── Routes ──
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/entities', requireAuth, entitiesRouter);
app.use('/api/v1/functions', requireAuth, functionsRouter);
app.use('/api/v1/upload', requireAuth, uploadRouter);

// ── Base44 SDK compatibility routes ──
// The frontend still uses @base44/sdk which expects these paths.
// We mount the same routers at the URLs the SDK generates.
app.use('/api/auth', authRouter);

// Special Base44 convention: GET/PUT /api/apps/:appId/entities/User/me
// MUST be registered BEFORE the generic entities router so it takes precedence.
app.get('/api/apps/:appId/entities/User/me', requireAuth, async (req, res, next) => {
  try {
    // DEV-läge: returnera dev-admin direkt utan DB-uppslag
    if (req.user.id === 'dev-admin-1') {
      return res.json({
        id: 'dev-admin-1', email: 'admin@lagerai.se', full_name: 'Admin',
        role: 'admin', secondary_roles: [], allowed_modules: [],
        home_page_override: null, mobile_preferred: false, is_active: true,
      });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, full_name: true, role: true,
        secondary_roles: true, allowed_modules: true,
        home_page_override: true, mobile_preferred: true, is_active: true,
      },
    });
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or deactivated' });
    }
    res.json(user);
  } catch (err) { next(err); }
});
app.put('/api/apps/:appId/entities/User/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: req.body,
      select: {
        id: true, email: true, full_name: true, role: true,
        secondary_roles: true, allowed_modules: true,
        home_page_override: true, mobile_preferred: true, is_active: true,
      },
    });
    res.json(user);
  } catch (err) { next(err); }
});

// Generic Base44 SDK entity & function compatibility routes
app.use('/api/apps/:appId/entities', requireAuth, entitiesRouter);
app.use('/api/apps/:appId/functions', requireAuth, functionsRouter);

// ── Admin routes (extra auth check) ──
app.use('/api/v1/admin', requireAuth, (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
});

// TODO: add admin-specific routes here

// ── Error handling ──
app.use(errorHandler);

// ── Graceful shutdown ──
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`🚀 Lager IM Server running on http://localhost:${PORT}`);
  console.log(`   WebSocket:   ws://localhost:${PORT}/ws`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Frontend:    ${FRONTEND_URL}`);
});
