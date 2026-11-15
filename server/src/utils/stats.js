import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import { round2, monthsBetween } from './dates.js';

const oid = (id) => new mongoose.Types.ObjectId(id);

/** Totals of income and expense in [from, to). Omit both for all time. */
export async function totals(userId, from, to) {
  const match = { user: oid(userId) };
  if (from || to) match.date = { ...(from && { $gte: from }), ...(to && { $lt: to }) };
  const rows = await Transaction.aggregate([{ $match: match }, { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }]);
  const out = { income: 0, expense: 0, count: 0 };
  for (const r of rows) {
    out[r._id] = round2(r.total);
    out.count += r.count;
  }
  return out;
}

/** Totals by category in [from, to), sorted high to low. */
export async function categoryTotals(userId, from, to, type = 'expense') {
  const rows = await Transaction.aggregate([
    { $match: { user: oid(userId), type, date: { $gte: from, $lt: to } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ]);
  return rows.map((r) => ({ category: r._id, total: round2(r.total) }));
}

/** One row per calendar month in [from, to), zero filled. */
export async function monthlySeries(userId, from, to) {
  const rows = await Transaction.aggregate([
    { $match: { user: oid(userId), date: { $gte: from, $lt: to } } },
    { $group: { _id: { m: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } }, t: '$type' }, total: { $sum: '$amount' } } },
  ]);
  const map = {};
  for (const r of rows) (map[r._id.m] ||= { income: 0, expense: 0 })[r._id.t] = round2(r.total);
  return monthsBetween(from, new Date(to.getTime() - 1)).map((month) => {
    const v = map[month] || { income: 0, expense: 0 };
    return { month, income: v.income, expense: v.expense, savings: round2(v.income - v.expense) };
  });
}

/** Map of YYYY-MM-DD to expense total, only for days with spending. */
export async function dailyExpenses(userId, from, to) {
  const rows = await Transaction.aggregate([
    { $match: { user: oid(userId), type: 'expense', date: { $gte: from, $lt: to } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' } }, total: { $sum: '$amount' } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, round2(r.total)]));
}
