import { Request, Response, NextFunction } from 'express';

// ─────────────────────────────────────────────────────────────────────────────
// Centralized error handler — must be registered LAST in app.ts with 4 params.
// Hides stack traces in production while logging them server-side.
// ─────────────────────────────────────────────────────────────────────────────

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const message    = statusCode === 500 ? 'Internal server error' : err.message;

  // Always log full error on server
  console.error(`[error] ${statusCode}:`, err);

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && statusCode === 500
      ? { stack: err.stack }
      : {}),
  });
}

/** Convenience: create an error with an HTTP status code attached. */
export function createError(message: string, statusCode: number): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  return err;
}
