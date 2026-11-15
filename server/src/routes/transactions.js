import { Router } from 'express';
import { z } from 'zod';
import Transaction from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import { wrap, validId } from '../middleware/error.js';
import { ALL_CATEGORIES, PAYMENT_METHODS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants.js';
import { round2 } from '../utils/dates.js';

const router = Router();
router.use(requireAuth);

const body = z
  .object({
    title: z.string().trim().min(1, 'Please enter a title.').max(120),
    amount: z.coerce.number({ invalid_type_error: 'Enter a valid amount.' }).positive('Amount must be greater than zero.').max(1e10).transform(round2),
    type: z.enum(['income', 'expense'], { errorMap: () => ({ message: 'Choose income or expense.' }) }),
    category: z.enum(ALL_CATEGORIES, { errorMap: () => ({ message: 'Choose a category.' }) }),
    date: z.coerce.date({ errorMap: () => ({ message: 'Enter a valid date.' }) }),
    paymentMethod: z.enum(PAYMENT_METHODS).default('UPI'),
    description: z.string().trim().max(300).optional().default(''),
    notes: z.string().trim().max(500).optional().default(''),
  })
  .refine((d) => (d.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).includes(d.category), {
    message: 'That category does not match the transaction type.',
    path: ['category'],
  });

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get(
  '/',
  wrap(async (req, res) => {
    const q = z
      .object({
        q: z.string().trim().max(100).optional(),
        category: z.enum(ALL_CATEGORIES).optional(),
        type: z.enum(['income', 'expense']).optional(),
        method: z.enum(PAYMENT_METHODS).optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        sort: z.enum(['date', 'amount']).default('date'),
        order: z.enum(['asc', 'desc']).default('desc'),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(req.query);

    const filter = { user: req.user._id };
    if (q.q) filter.$or = [{ title: new RegExp(esc(q.q), 'i') }, { description: new RegExp(esc(q.q), 'i') }];
    if (q.category) filter.category = q.category;
    if (q.type) filter.type = q.type;
    if (q.method) filter.paymentMethod = q.method;
    if (q.from || q.to) {
      filter.date = {};
      if (q.from) filter.date.$gte = q.from;
      if (q.to) filter.date.$lte = new Date(q.to.getTime() + 24 * 3600 * 1000 - 1); // inclusive of the whole "to" day
    }
    const dir = q.order === 'asc' ? 1 : -1;
    const sort = q.sort === 'amount' ? { amount: dir, date: -1 } : { date: dir, createdAt: -1 };
    const [items, total] = await Promise.all([
      Transaction.find(filter).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
      Transaction.countDocuments(filter),
    ]);
    res.json({ items, total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) });
  })
);

router.post(
  '/',
  wrap(async (req, res) => {
    const data = body.parse(req.body);
    const tx = await Transaction.create({ ...data, user: req.user._id });
    res.status(201).json({ transaction: tx });
  })
);

router.put(
  '/:id',
  validId,
  wrap(async (req, res) => {
    const data = body.parse(req.body);
    const tx = await Transaction.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, data, { new: true, runValidators: true });
    if (!tx) return res.status(404).json({ error: 'Transaction not found.' });
    res.json({ transaction: tx });
  })
);

router.delete(
  '/:id',
  validId,
  wrap(async (req, res) => {
    const tx = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!tx) return res.status(404).json({ error: 'Transaction not found.' });
    res.json({ ok: true });
  })
);

export default router;
