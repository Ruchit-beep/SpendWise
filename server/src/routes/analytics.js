import { Router } from 'express';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import Transaction from '../models/Transaction.js';
import SavingsGoal from '../models/SavingsGoal.js';
import Budget from '../models/Budget.js';
import { requireAuth } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';
import { OVERALL } from '../constants.js';
import { addMonths, startOfMonth, monthKey, monthRange, round2, pctChange, dayKeysBetween } from '../utils/dates.js';
import { totals, categoryTotals, monthlySeries, dailyExpenses } from '../utils/stats.js';
import { budgetsWithSpend } from './budgets.js';

const router = Router();
router.use(requireAuth);

function buildInsights({ cur, prev, catsNow, catsPrev, budget }) {
  const out = [];
  const prevMap = Object.fromEntries(catsPrev.map((c) => [c.category, c.total]));
  const nowMap = Object.fromEntries(catsNow.map((c) => [c.category, c.total]));
  const names = new Set([...Object.keys(prevMap), ...Object.keys(nowMap)]);
  let up = null;
  let down = null;
  for (const c of names) {
    const a = nowMap[c] || 0;
    const b = prevMap[c] || 0;
    const diff = round2(a - b);
    if (diff > 0 && (!up || diff > up.amount)) up = { kind: 'category_up', category: c, amount: diff, pct: pctChange(a, b) };
    if (diff < 0 && b > 0 && (!down || b - a > down.amount)) down = { kind: 'category_down', category: c, amount: round2(b - a), pct: pctChange(a, b) === null ? null : Math.abs(pctChange(a, b)) };
  }
  if (budget) out.push(budget.remaining >= 0 ? { kind: 'budget_remaining', amount: budget.remaining } : { kind: 'budget_exceeded', amount: Math.abs(budget.remaining) });
  if (up) out.push(up);
  if (down) out.push(down);
  if (catsNow[0]) out.push({ kind: 'top_category', category: catsNow[0].category, amount: catsNow[0].total });
  if (cur.income > 0) out.push({ kind: 'savings_rate', pct: round2(((cur.income - cur.expense) / cur.income) * 100) });
  return out.slice(0, 5);
}

router.get(
  '/dashboard',
  wrap(async (req, res) => {
    const uid = req.user._id;
    const now = new Date();
    const thisStart = startOfMonth(now);
    const nextStart = addMonths(thisStart, 1);
    const prevStart = addMonths(thisStart, -1);
    const sixAgo = addMonths(thisStart, -5);
    const month = monthKey(now);

    const [all, cur, prev, series, catsNow, catsPrev, recent, budgets, goals, demoCount] = await Promise.all([
      totals(uid),
      totals(uid, thisStart, nextStart),
      totals(uid, prevStart, thisStart),
      monthlySeries(uid, sixAgo, nextStart),
      categoryTotals(uid, thisStart, nextStart),
      categoryTotals(uid, prevStart, thisStart),
      Transaction.find({ user: uid }).sort({ date: -1, createdAt: -1 }).limit(6).lean(),
      budgetsWithSpend(uid, month),
      SavingsGoal.find({ user: uid }).sort({ createdAt: -1 }).lean(),
      Transaction.countDocuments({ user: uid, isDemo: true }),
    ]);

    let overall = budgets.find((b) => b.category === OVERALL);
    let budgetSource = 'budget';
    if (!overall && req.user.monthlyBudgetPref > 0) {
      const limit = req.user.monthlyBudgetPref;
      overall = { limit, spent: cur.expense, remaining: round2(limit - cur.expense), pct: round2((cur.expense / limit) * 100) };
      budgetSource = 'preference';
    }
    const savingsNow = round2(cur.income - cur.expense);
    const savingsPrev = round2(prev.income - prev.expense);
    const balNow = round2(all.income - all.expense);
    // Balance at the end of last month, for the comparison arrow.
    const allBeforeThis = await totals(uid, undefined, thisStart);
    const balPrev = round2(allBeforeThis.income - allBeforeThis.expense);

    res.json({
      month,
      hasData: all.count > 0 || goals.length > 0 || budgets.length > 0,
      hasDemo: demoCount > 0,
      cards: {
        balance: { value: balNow, previous: balPrev, change: pctChange(balNow, balPrev) },
        income: { value: cur.income, previous: prev.income, change: pctChange(cur.income, prev.income) },
        expense: { value: cur.expense, previous: prev.expense, change: pctChange(cur.expense, prev.expense) },
        savings: { value: savingsNow, previous: savingsPrev, change: savingsPrev > 0 ? pctChange(savingsNow, savingsPrev) : null },
      },
      series,
      categories: catsNow,
      recent,
      budget: overall ? { ...overall, source: budgetSource } : null,
      goals: goals.filter((g) => g.savedAmount < g.targetAmount).slice(0, 4),
      insights: buildInsights({ cur, prev, catsNow, catsPrev, budget: overall }),
    });
  })
);

const rangeSchema = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() });
function parseRange(query) {
  const q = rangeSchema.parse(query);
  const now = new Date();
  const toDay = q.to ? new Date(Date.UTC(q.to.getUTCFullYear(), q.to.getUTCMonth(), q.to.getUTCDate())) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from = q.from ? new Date(Date.UTC(q.from.getUTCFullYear(), q.from.getUTCMonth(), q.from.getUTCDate())) : addMonths(startOfMonth(toDay), -5);
  if (from > toDay) {
    const e = new Error('The start date must be before the end date.');
    e.status = 400;
    throw e;
  }
  return { from, toDay, toExclusive: new Date(toDay.getTime() + 24 * 3600 * 1000) };
}

async function buildReport(userId, query) {
  const { from, toDay, toExclusive } = parseRange(query);
  const [tot, cats, months, dailyMap] = await Promise.all([totals(userId, from, toExclusive), categoryTotals(userId, from, toExclusive), monthlySeries(userId, from, toExclusive), dailyExpenses(userId, from, toExclusive)]);
  const dayKeys = dayKeysBetween(from, toDay);
  const days = dayKeys.length || 1;
  const daily = dayKeys.map((d) => ({ date: d, expense: dailyMap[d] || 0 }));
  return {
    range: { from: from.toISOString().slice(0, 10), to: toDay.toISOString().slice(0, 10), days },
    summary: {
      income: tot.income,
      expense: tot.expense,
      net: round2(tot.income - tot.expense),
      savingsRate: tot.income > 0 ? round2(((tot.income - tot.expense) / tot.income) * 100) : null,
      avgDailySpend: round2(tot.expense / days),
      topCategory: cats[0] || null,
      transactions: tot.count,
    },
    months,
    categories: cats,
    daily: daily.length > 400 ? undefined : daily,
  };
}

router.get(
  '/report',
  wrap(async (req, res) => {
    try {
      res.json(await buildReport(req.user._id, req.query));
    } catch (e) {
      if (e.status === 400) return res.status(400).json({ error: e.message });
      throw e;
    }
  })
);

// Spreadsheet apps run cells starting with = + - @ as formulas; prefix them so exports are safe to open.
const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

router.get(
  '/export.csv',
  wrap(async (req, res) => {
    const { from, toExclusive, toDay } = parseRange(req.query);
    const rows = await Transaction.find({ user: req.user._id, date: { $gte: from, $lt: toExclusive } }).sort({ date: 1 }).lean();
    const head = ['Date', 'Title', 'Type', 'Category', 'Payment Method', 'Amount', 'Description', 'Notes'];
    const lines = [head.join(',')].concat(rows.map((r) => [r.date.toISOString().slice(0, 10), r.title, r.type, r.category, r.paymentMethod, r.amount.toFixed(2), r.description, r.notes].map(csvCell).join(',')));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="spendwise-${from.toISOString().slice(0, 10)}_to_${toDay.toISOString().slice(0, 10)}.csv"`);
    res.send('\uFEFF' + lines.join('\r\n'));
  })
);

router.get(
  '/export.pdf',
  wrap(async (req, res) => {
    let report;
    try {
      report = await buildReport(req.user._id, req.query);
    } catch (e) {
      if (e.status === 400) return res.status(400).json({ error: e.message });
      throw e;
    }
    // Helvetica has no rupee glyph, so amounts use the ISO currency code.
    const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: req.user.currency, currencyDisplay: 'code' }).format(n).replace(/\u00a0/g, ' ');
    const { summary: s, range } = report;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="spendwise-summary-${range.from}_to_${range.to}.pdf"`);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);
    doc.fontSize(24).fillColor('#242424').text('SpendWise', { continued: true }).fontSize(12).fillColor('#666').text('   Financial summary');
    doc.moveDown(0.3).fontSize(11).fillColor('#444').text(`${req.user.name}  |  ${range.from} to ${range.to}  (${range.days} days)`);
    doc.moveDown(1).fontSize(14).fillColor('#242424').text('Overview');
    doc.moveDown(0.4).fontSize(11).fillColor('#242424');
    const line = (k, v) => doc.text(`${k}: `, { continued: true }).font('Helvetica-Bold').text(v).font('Helvetica');
    line('Total income', money(s.income));
    line('Total expenses', money(s.expense));
    line('Net savings', money(s.net));
    line('Savings rate', s.savingsRate === null ? 'n/a (no income)' : `${s.savingsRate}%`);
    line('Average daily spending', money(s.avgDailySpend));
    line('Highest spending category', s.topCategory ? `${s.topCategory.category} (${money(s.topCategory.total)})` : 'n/a');
    line('Transactions', String(s.transactions));
    doc.moveDown(1).fontSize(14).text('Spending by category').moveDown(0.4).fontSize(11);
    if (!report.categories.length) doc.fillColor('#666').text('No expenses in this period.').fillColor('#242424');
    for (const c of report.categories) doc.text(`${c.category}`, { continued: true }).text(`   ${money(c.total)}`, { align: 'right' });
    doc.moveDown(1).fontSize(14).text('Month by month').moveDown(0.4).fontSize(11);
    for (const m of report.months) doc.text(`${m.month}   income ${money(m.income)}   expenses ${money(m.expense)}   saved ${money(m.savings)}`);
    doc.moveDown(2).fontSize(9).fillColor('#888').text(`Generated ${new Date().toISOString().slice(0, 10)} from your SpendWise records.`);
    doc.end();
  })
);

export default router;
