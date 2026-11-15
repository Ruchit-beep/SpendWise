import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { setSession, clearSession, requireAuth } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';
import { sendMail } from '../utils/mailer.js';
import { verifyGoogleCredential } from '../utils/google.js';

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
    if (user && !user.passwordHash) return res.status(401).json({ error: 'This account uses Google sign-in. Use "Continue with Google", or "Forgot password" to set a password.' });
    if (!user || !ok) return res.status(401).json({ error: 'Incorrect email or password.' });
    setSession(res, user.id);
    res.json({ user: user.toSafe() });
  })
);


const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const emailOnly = z.object({ email: z.string().trim().toLowerCase().email('Please enter a valid email address.') });
const GENERIC = 'If an account exists for that email, a reset link is on its way. It expires in 1 hour.';

function appUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') return null; // never build links from the Host header in production
  return process.env.CLIENT_ORIGIN?.split(',')[0] || `${req.protocol}://${req.get('host')}`;
}

// Tells the front end whether to show the Google button (the client ID is public by design).
router.get('/config', (req, res) => res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null }));

router.post(
  '/forgot',
  limiter,
  wrap(async (req, res) => {
    const { email } = emailOnly.parse(req.body);
    const user = await User.findOne({ email });
    if (user) {
      const base = appUrl(req);
      if (!base) {
        console.error('APP_URL is not set, so no reset email was sent.');
      } else {
        const token = crypto.randomBytes(32).toString('hex');
        user.resetTokenHash = sha256(token); // only the hash is stored
        user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
        await user.save();
        const link = `${base}/reset-password?token=${token}`;
        const text = `Hi ${user.name},\n\nUse this link to choose a new SpendWise password (valid for 1 hour):\n${link}\n\nIf you didn't ask for this, you can ignore this email. Your password won't change.`;
        const html = `<p>Hi ${user.name.replace(/[<>&"]/g, '')},</p><p><a href="${link}">Choose a new SpendWise password</a> (valid for 1 hour).</p><p>If you didn't ask for this, you can ignore this email. Your password won't change.</p>`;
        // Not awaited, so response time doesn't reveal whether the account exists.
        sendMail({ to: user.email, subject: 'Reset your SpendWise password', text, html }).catch((e) => console.error('Reset email failed:', e.message));
      }
    }
    res.json({ message: GENERIC });
  })
);

router.post(
  '/reset',
  limiter,
  wrap(async (req, res) => {
    const { token, password: newPassword } = z.object({ token: z.string().min(20).max(200), password }).parse(req.body);
    const user = await User.findOne({ resetTokenHash: sha256(token), resetTokenExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.hasPassword = true;
    user.passwordChangedAt = new Date(); // signs out every existing session
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    res.json({ ok: true });
  })
);

router.post(
  '/google',
  limiter,
  wrap(async (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'Google sign-in is not set up on this server.' });
    const { credential } = z.object({ credential: z.string().min(20).max(4096) }).parse(req.body);
    let p;
    try {
      p = await verifyGoogleCredential(credential);
    } catch {
      return res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
    }
    if (!p?.sub || !p.email || p.email_verified !== true) return res.status(401).json({ error: 'Your Google email address is not verified.' });
    const email = p.email.toLowerCase();
    let user = await User.findOne({ googleId: p.sub });
    if (!user) {
      user = await User.findOne({ email });
      if (user && user.googleId && user.googleId !== p.sub) return res.status(409).json({ error: 'That email is linked to a different Google account.' });
      if (user) {
        user.googleId = p.sub; // existing account, same verified email: link it
        await user.save();
      } else {
        user = await User.create({ name: (p.name || email.split('@')[0]).slice(0, 80), email, googleId: p.sub, hasPassword: false });
      }
    }
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
