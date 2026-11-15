// All month maths is done in UTC so results do not depend on the server's time zone.
export const monthKey = (d) => d.toISOString().slice(0, 7);
export const monthRange = (key) => {
  const [y, m] = key.split('-').map(Number);
  return [new Date(Date.UTC(y, m - 1, 1)), new Date(Date.UTC(y, m, 1))];
};
export const addMonths = (date, n) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + n, 1));
export const startOfMonth = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
export const monthsBetween = (from, to) => {
  const out = [];
  let c = startOfMonth(from);
  const end = startOfMonth(to);
  while (c <= end && out.length < 240) {
    out.push(monthKey(c));
    c = addMonths(c, 1);
  }
  return out;
};
export const dayKeysBetween = (from, to) => {
  const out = [];
  const c = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  while (c <= to && out.length < 1100) {
    out.push(c.toISOString().slice(0, 10));
    c.setUTCDate(c.getUTCDate() + 1);
  }
  return out;
};
export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const pctChange = (cur, prev) => (prev > 0 ? round2(((cur - prev) / prev) * 100) : null);
