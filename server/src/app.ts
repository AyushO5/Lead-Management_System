import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

// ── Feature routers ──────────────────────────────────────────────────────────
import authRoutes   from './features/auth/auth.routes';
import publicRoutes from './features/public/public.routes';
import leadRoutes   from './features/leads/lead.routes';
import noteRoutes   from './features/notes/note.routes';
import userRoutes   from './features/users/user.routes';

// ── Middleware ────────────────────────────────────────────────────────────────
import { errorHandler } from './middleware/error.middleware';

const app = express();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────

// Health (public)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth: login, me
app.use('/api/auth', authRoutes);

// Public lead capture (no auth)
app.use('/api/public', publicRoutes);

// Leads (auth inside router)
app.use('/api/leads', leadRoutes);

// Notes — nested under leads; mergeParams is set on the noteRouter
app.use('/api/leads/:id/notes', noteRoutes);

// Users — ADMIN only (auth + role inside router)
app.use('/api/users', userRoutes);

// ── 404 handler — JSON, not Express HTML ─────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Centralized error handler (must be last, 4 params) ───────────────────────
app.use(errorHandler);

export default app;
