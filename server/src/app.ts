import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';

import authRoutes      from './features/auth/auth.routes';
import publicRoutes    from './features/public/public.routes';
import leadRoutes      from './features/leads/lead.routes';
import noteRoutes      from './features/notes/note.routes';
import userRoutes      from './features/users/user.routes';
import dashboardRoutes from './features/dashboard/dashboard.routes';

import { errorHandler } from './middleware/error.middleware';

const app = express();

const allowedOrigin = process.env.CLIENT_URL;

app.use(cors({
  origin: allowedOrigin || false,
  credentials: true,
}));

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/leads/:id/notes', noteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

export default app;
