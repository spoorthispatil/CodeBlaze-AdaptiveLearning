import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db/database.js';
import authRouter from './routes/auth.js';
import quizRouter from './routes/quiz.js';
import learningRouter from './routes/learning.js';
import aiProxyRouter from './routes/ai-proxy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3000', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

async function start() {
  await initDb();

  const app = express();
  const httpServer = createServer(app);

  const io = new Server(httpServer, { cors: { origin: '*' } });
  io.on('connection', socket => {
    socket.on('join-room', (uid: string) => socket.join(uid));
    socket.on('mastery-update', (d: any) => io.to(d.userId).emit('mastery-updated', d));
  });

  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '10mb' }));

  app.use('/api/auth', authRouter);
  app.use('/api/quiz', quizRouter);
  app.use('/api/learning', learningRouter);
  app.use('/api/ai', aiProxyRouter);

  app.get('/api/health', (_req, res) => res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ai: !!process.env.GEMINI_API_KEY,
  }));

  if (IS_PROD) {
    const dist = path.join(__dirname, '../dist');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  } else {
    const { createServer: viteCreate } = await import('vite');
    const vite = await viteCreate({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  // Auto-find a free port if the preferred one is busy
  const tryListen = (port: number) => {
    httpServer.listen(port, '0.0.0.0');

    httpServer.once('listening', () => {
      console.log(`\n🔥 CodeBlaze running at http://localhost:${port}`);
      console.log(`   AI: ${process.env.GEMINI_API_KEY ? '✅ Gemini Flash (free, adaptive)' : '⚠️  Set GEMINI_API_KEY in .env for AI features'}`);
      console.log(`   DB: SQLite (pure JS, no native build)\n`);
      if (port !== PORT) {
        console.log(`   ℹ️  Port ${PORT} was busy — started on ${port} instead.\n`);
      }
    });

    httpServer.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️  Port ${port} is already in use — trying ${port + 1}...`);
        httpServer.removeAllListeners('error');
        httpServer.removeAllListeners('listening');
        tryListen(port + 1);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
  };

  tryListen(PORT);
}

start().catch(err => { console.error('Startup failed:', err); process.exit(1); });
