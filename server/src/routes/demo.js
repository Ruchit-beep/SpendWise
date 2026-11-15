import { Router } from 'express';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import SavingsGoal from '../models/SavingsGoal.js';
import { requireAuth } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';
import { addMonths, startOfMonth, monthKey } from '../utils/dates.js';
import { OVERALL } from '../constants.js';

const router = Router();
router.use(requireAuth);

// Fixed-seed generator: the same sample story every time.
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

const EXPENSES = [
  ['Rent', 'Bills', 12000, 0, 'Bank Transfer', 1],
  ['Electricity bill', 'Bills', 1400, 600, 'UPI', 8],
  ['Mobile recharge', 'Bills', 599, 0, 'UPI', 5],
  ['Groceries', 'Food', 1800, 900, 'UPI', 4],
  ['Groceries', 'Food', 1500, 800, 'Debit Card', 15],
  ['Lunch with friends', 'Food', 650, 350, 'UPI', 11],
  ['Swiggy order', 'Food', 420, 250, 'Credit Card', 19],
  ['Metro card top-up', 'Transport', 500, 200, 'UPI', 6],
  ['Cab ride', 'Transport', 380, 250, 'UPI', 17],
  ['Fuel', 'Transport', 1200, 400, 'Debit Card', 22],
  ['New shirt', 'Shopping', 1800, 1500, 'Credit Card', 13],
  ['Online order', 'Shopping', 1500, 2000, 'Credit Card', 24],
  ['Movie night', 'Entertainment', 700, 300, 'UPI', 20],
  ['Streaming subscription', 'Entertainment', 499, 0, 'Credit Card', 3],
  ['Pharmacy', 'Healthcare', 450, 400, 'Cash', 16],
  ['Online course', 'Education', 1999, 1500, 'Debit Card', 9],
  ['Coffee & snacks', 'Food', 220, 150, 'Cash', 26],
  ['Gift for a friend', 'Other', 900, 600, 'UPI', 21],
];

router.post(
  '/',
  wrap(async (req, res) => {
    if (await Transaction.exists({ user: req.user._id, isDemo: true })) return res.status(409).json({ error: 'Sample data is already loaded.' });
    const rand = rng(42);
    const uid = req.user._id;
    const base = startOfMonth(new Date());
    const today = new Date();
    const docs = [];
    for (let i = 5; i >= 0; i--) {
      const ms = addMonths(base, -i);
      const mk = (day) => new Date(Date.UTC(ms.getUTCFullYear(), ms.getUTCMonth(), Math.min(day, 28)));
      const add = (d) => {
        if (d.date <= today) docs.push({ ...d, user: uid, isDemo: true, description: 'Sample data' });
      };
      add({ title: 'Salary', amount: 52000, type: 'income', category: 'Salary', date: mk(1), paymentMethod: 'Bank Transfer' });
      if (i % 2 === 0) add({ title: 'Freelance project', amount: 9000 + Math.round(rand() * 6000), type: 'income', category: 'Freelance', date: mk(14), paymentMethod: 'UPI' });
      for (const [title, category, amt, spread, paymentMethod, day] of EXPENSES) {
        if (rand() < 0.12 && spread > 0) continue;
        add({ title, amount: Math.round(amt + rand() * spread), type: 'expense', category, date: mk(day), paymentMethod });
      }
    }
    await Transaction.insertMany(docs);
    const month = monthKey(new Date());
    const budgets = [
      [OVERALL, 30000],
      ['Food', 7000],
      ['Shopping', 3500],
      ['Transport', 3000],
      ['Entertainment', 1500],
    ];
    for (const [category, limit] of budgets) {
      await Budget.updateOne({ user: uid, month, category }, { $setOnInsert: { limit, isDemo: true } }, { upsert: true });
    }
    await SavingsGoal.insertMany([
      { user: uid, name: 'Emergency Fund', targetAmount: 100000, savedAmount: 42000, description: 'Sample goal: three months of expenses', isDemo: true, targetDate: addMonths(base, 10) },
      { user: uid, name: 'New Laptop', targetAmount: 70000, savedAmount: 18500, description: 'Sample goal', isDemo: true, targetDate: addMonths(base, 6) },
      { user: uid, name: 'Goa Trip', targetAmount: 25000, savedAmount: 22000, description: 'Sample goal', isDemo: true, targetDate: addMonths(base, 2) },
    ]);
    res.status(201).json({ ok: true, transactions: docs.length });
  })
);

// Remove only sample data. The user's own records are never touched.
router.delete(
  '/',
  wrap(async (req, res) => {
    const f = { user: req.user._id, isDemo: true };
    const [t, b, g] = await Promise.all([Transaction.deleteMany(f), Budget.deleteMany(f), SavingsGoal.deleteMany(f)]);
    res.json({ ok: true, removed: t.deletedCount + b.deletedCount + g.deletedCount });
  })
);

export default router;
