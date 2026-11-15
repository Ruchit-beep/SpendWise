import { Router } from 'express';
import { z } from 'zod';
import SavingsGoal from '../models/SavingsGoal.js';
import { requireAuth } from '../middleware/auth.js';
import { wrap, validId } from '../middleware/error.js';
import { round2 } from '../utils/dates.js';

const router = Router();
router.use(requireAuth);

const money = (label) => z.coerce.number({ invalid_type_error: `Enter a valid ${label}.` }).max(1e10).transform(round2);
const body = z.object({
  name: z.string().trim().min(1, 'Give your goal a name.').max(80),
  targetAmount: money('target').pipe(z.number().min(1, 'Target must be at least 1.')),
  savedAmount: money('amount').pipe(z.number().min(0, 'Saved amount cannot be negative.')).optional().default(0),
  targetDate: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.date().nullable()).optional().default(null),
  description: z.string().trim().max(300).optional().default(''),
});

router.get(
  '/',
  wrap(async (req, res) => {
    res.json({ goals: await SavingsGoal.find({ user: req.user._id }).sort({ createdAt: -1 }).lean() });
  })
);

router.post(
  '/',
  wrap(async (req, res) => {
    const goal = await SavingsGoal.create({ ...body.parse(req.body), user: req.user._id });
    res.status(201).json({ goal });
  })
);

router.put(
  '/:id',
  validId,
  wrap(async (req, res) => {
    const goal = await SavingsGoal.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { ...body.parse(req.body), isDemo: false }, { new: true, runValidators: true });
    if (!goal) return res.status(404).json({ error: 'Goal not found.' });
    res.json({ goal });
  })
);

router.post(
  '/:id/contribute',
  validId,
  wrap(async (req, res) => {
    const amount = money('amount').pipe(z.number().positive('Amount must be greater than zero.')).parse(req.body.amount);
    const goal = await SavingsGoal.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $inc: { savedAmount: amount } }, { new: true });
    if (!goal) return res.status(404).json({ error: 'Goal not found.' });
    res.json({ goal });
  })
);

router.delete(
  '/:id',
  validId,
  wrap(async (req, res) => {
    const g = await SavingsGoal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!g) return res.status(404).json({ error: 'Goal not found.' });
    res.json({ ok: true });
  })
);

export default router;
