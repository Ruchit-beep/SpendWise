import { ZodError } from 'zod';
import mongoose from 'mongoose';

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    const fields = {};
    for (const i of err.issues) fields[i.path.join('.') || '_'] ||= i.message;
    return res.status(400).json({ error: Object.values(fields)[0] || 'Invalid input.', fields });
  }
  if (err instanceof mongoose.Error.CastError) return res.status(400).json({ error: 'Invalid identifier.' });
  if (err?.code === 11000) return res.status(409).json({ error: 'That already exists.' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON.' });
  if (err?.status === 400) return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
}

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function validId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid identifier.' });
  next();
}
