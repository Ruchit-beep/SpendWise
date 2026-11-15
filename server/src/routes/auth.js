import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { setSession, clearSession, requireAuth } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password is too long.')
  .regex(/[A-Za-z]/, 'Password must include a letter.')
  .regex(/\d/, 'Password must include a number.');

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name.').max(80),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
  password,
});
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
});

// A real hash so unknown emails take as long as wrong passwords (no timing leak).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

router.post(
  '/register',
  limiter,
  wrap(async (req, res) => {
    const data = registerSchema.parse(req.body);
    if (await User.exists({ email: data.email })) return res.status(409).json({ error: 'An account with this email already exists.', fields: { email: 'Already registered.' } });
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({ name: data.name, email: data.email, passwordHash });
    setSession(res, user.id);
    res.status(201).json({ user: user.toSafe() });
  })
);

router.post(
  '/login',
  limiter,
  wrap(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email }).select('+passwordHash');
    const ok = await bcrypt.compare(data.password, user?.passwordHash || DUMMY_HASH);
    if (!user || !ok) return res.status(401).json({ error: 'Incorrect email or password.' });
    setSession(res, user.id);
    res.json({ user: user.toSafe() });
  })
);

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toSafe() }));

export default router;
