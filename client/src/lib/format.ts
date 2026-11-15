import type { Currency } from './types'

const locale = (c: Currency) => (c === 'INR' ? 'en-IN' : 'en-US')

export function formatMoney(n: number, currency: Currency = 'INR', opts: { compact?: boolean } = {}) {
  const whole = Number.isInteger(n) || currency === 'JPY'
  return new Intl.NumberFormat(locale(currency), {
    style: 'currency',
    currency,
    notation: opts.compact ? 'compact' : 'standard',
    minimumFractionDigits: opts.compact || whole ? 0 : 2,
    maximumFractionDigits: opts.compact ? 1 : 2,
  }).format(n)
}

export const currencySymbol = (currency: Currency) =>
  new Intl.NumberFormat(locale(currency), { style: 'currency', currency }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency

export const pct = (n: number) => `${Math.abs(Math.round(n * 10) / 10)}%`

/** 'YYYY-MM-DD' or ISO string to 14 Nov 2026, with no time-zone shift. */
export function formatDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
export const toInputDate = (iso: string) => iso.slice(0, 10)
export const todayInput = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const monthLabel = (key: string, long = false) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: long ? 'long' : 'short', year: long ? 'numeric' : '2-digit', timeZone: 'UTC' })
}
export const currentMonthKey = () => todayInput().slice(0, 7)
