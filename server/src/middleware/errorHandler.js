/**
 * Global error handler
 */

export function errorHandler(err, _req, res, _next) {
  console.error('[ERROR]', err);

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors,
    });
  }

  // Prisma errors
  if (err.code?.startsWith('P')) {
    const prismaErrors = {
      P2002: { status: 409, message: 'Unique constraint violation' },
      P2003: { status: 409, message: 'Foreign key constraint failed' },
      P2025: { status: 404, message: 'Record not found' },
    };
    const mapped = prismaErrors[err.code];
    if (mapped) {
      return res.status(mapped.status).json({ error: mapped.message });
    }
  }

  // Default
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
}
