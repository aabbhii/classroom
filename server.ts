import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { apiRouter } from './server/routes/index';
import { initDatabase } from './server/db';
import { initPostgres, isPostgresConnected } from './server/pg';

dotenv.config();

const ROOT_DIR = process.cwd();

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 5000;

// Initialize database
initDatabase();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
const uploadsDir = path.resolve(ROOT_DIR, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Mount comprehensive API router
app.use('/api', apiRouter);

// Mount Vite in dev mode or serve static dist in production
async function startServer() {
  await initPostgres();

  const distPath = path.resolve(ROOT_DIR, 'dist');
  const isDevCommand = process.env.npm_lifecycle_event === 'dev';
  const isProduction = process.env.NODE_ENV === 'production' || (!isDevCommand && fs.existsSync(distPath));

  if (isProduction && fs.existsSync(distPath)) {
    console.log('[Server] Serving production static assets from dist/');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    console.log('[Server] Initializing Vite middleware for live development...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(DEFAULT_PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(` Smart Classroom Management System is running!`);
    console.log(` Local URL:    http://localhost:${DEFAULT_PORT}`);
    console.log(` Network URL:  http://0.0.0.0:${DEFAULT_PORT}`);
    console.log(` API Endpoint: http://localhost:${DEFAULT_PORT}/api`);
    console.log(` Health Check: http://localhost:${DEFAULT_PORT}/api/health`);
    console.log(` Database:     ${isPostgresConnected() ? 'PostgreSQL (Connected)' : 'LocalStore (Active Fallback)'}`);
    console.log(` Mode:         ${isProduction ? 'Production' : 'Development'}`);
    console.log(`======================================================\n`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = DEFAULT_PORT + 1;
      console.warn(`[Server] Port ${DEFAULT_PORT} is in use. Retrying on port ${fallbackPort}...`);
      app.listen(fallbackPort, '0.0.0.0', () => {
        console.log(`[Server] Successfully started on fallback port http://localhost:${fallbackPort}`);
      });
    } else {
      console.error('[Server] Fatal listen error:', err);
    }
  });
}

startServer();
