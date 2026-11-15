import { Router } from 'express';
import { z } from 'zod';
import Budget from '../models/Budget.js';
import { requireAuth } from '../middleware/auth.js';
import { wrap, validId } from '../middleware/error.js';
import { EXPENSE_CATEGORIES, OVERALL } from '../constants.js';
import { monthKey, monthRange, round2 } from '../utils/dates.js';
import { categoryTotals, totals } from '../utils/stats.js';

const router = Router();
router.use(requireAuth);

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must look like 2026-11.');
const body = z.object({
  month: monthSchema,
  category: z.enum([OVERALL, ...EXPENSE_CATEGORIES], { errorMap: () => ({ message: 'Choose a category.' }) }),
  limit: z.coerce.number({ invalid_type_error: 'Enter a valid amount.' }).min(1, 'Budget must be at least 1.').max(1e10).transform(round2),
});

export async function budgetsWithSpend(userId, month) {
  const [from, to] = monthRange(month);
  const [budgets, cats, tot] = await Promise.all([Budget.find({ user: userId, month }).sort({ category: 1 }).lean(), categoryTotals(userId, from, to), totals(userId, from, to)]);
  const byCat = Object.fromEntries(cats.map((c) => [c.category, c.total]));
  return budgets.map((b) => {
    const spent = b.category === OVERALL ? tot.expense : byCat[b.category] || 0;
    return { ...b, spent: round2(spent), remaining: round2(b.limit - spent), pct: round2((spent / b.limit) * 100) };
  });
}

router.get(
  '/',
  wrap(async (req, res) => {
    const month = monthSchema.default(monthKey(new Date())).parse(req.query.month);
    res.json({ month, budgets: await budgetsWithSpend(req.user._id, month) });
  })
);

// Create or replace the budget for (month, category).
router.post(
  '/',
  wrap(async (req, res) => {
    const data = body.parse(req.body);
    const budget = await Budget.findOneAndUpdate({ user: req.user._id, month: data.month, category: data.category }, { $set: { limit: data.limit, isDemo: false } }, { new: true, upsert: true, runValidators: true });
    res.status(201).json({ budget });
  })
);

router.put(
  '/:id',
  validId,
  wrap(async (req, res) => {
    const limit = body.shape.limit.parse(req.body.limit);
    const budget = await Budget.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { limit, isDemo: false }, { new: true });
    if (!budget) return res.status(404).json({ error: 'Budget not found.' });
    res.json({ budget });
  })
);

router.delete(
  '/:id',
  validId,
  wrap(async (req, res) => {
    const b = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!b) return res.status(404).json({ error: 'Budget not found.' });
    res.json({ ok: true });
  })
);

export default router;
