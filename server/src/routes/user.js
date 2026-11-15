import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '../models/User.js';
import { requireAuth, setSession } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';
import { CURRENCIES, THEMES } from '../constants.js';

const router = Router();
router.use(requireAuth);

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name.').max(80),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
  phone: z.string().trim().max(30).optional().default(''),
  occupation: z.string().trim().max(80).optional().default(''),
  bio: z.string().trim().max(300).optional().default(''),
});
const prefsSchema = z.object({
  currency: z.enum(CURRENCIES).optional(),
  theme: z.enum(THEMES).optional(),
  monthlyBudgetPref: z.coerce.number().min(0).max(1e10).optional(),
});
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128)
    .regex(/[A-Za-z]/, 'Password must include a letter.')
    .regex(/\d/, 'Password must include a number.'),
});

router.put(
  '/profile',
  wrap(async (req, res) => {
    const data = profileSchema.parse(req.body);
    if (data.email !== req.user.email && (await User.exists({ email: data.email }))) return res.status(409).json({ error: 'That email is already in use.', fields: { email: 'Already in use.' } });
    Object.assign(req.user, data);
    await req.user.save();
    res.json({ user: req.user.toSafe() });
  })
);

router.put(
  '/preferences',
  wrap(async (req, res) => {
    const data = prefsSchema.parse(req.body);
    Object.assign(req.user, data);
    await req.user.save();
    res.json({ user: req.user.toSafe() });
  })
);

router.put(
  '/password',
  wrap(async (req, res) => {
    const data = passwordSchema.parse(req.body);
    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user.passwordHash) return res.status(400).json({ error: 'Your account uses Google sign-in. To set a password, log out and use "Forgot password" on the login page.' });
    if (!(await bcrypt.compare(data.currentPassword, user.passwordHash))) return res.status(400).json({ error: 'Current password is incorrect.', fields: { currentPassword: 'Incorrect password.' } });
    user.passwordHash = await bcrypt.hash(data.newPassword, 12);
    user.passwordChangedAt = new Date(); // other devices get signed out
    await user.save();
    setSession(res, user.id); // keep this device logged in
    res.json({ ok: true });
  })
);

export default router;
