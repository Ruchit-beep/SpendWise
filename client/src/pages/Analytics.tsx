import { useState, type ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, FileText } from 'lucide-react'
import { qs } from '../lib/api'
import { colorFor } from '../lib/constants'
import { formatDate, monthLabel, pct, todayInput } from '../lib/format'
import type { Report } from '../lib/types'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { EmptyState, Notice, PageHeader, Spinner } from '../components/ui'

const tip = { borderRadius: 12, border: '2px solid #242424', color: '#242424' }

function shiftMonths(n: number) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
const PRESETS = [
  { label: 'Last 30 days', get: () => { const d = new Date(); d.setDate(d.getDate() - 29); return [`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, todayInput()] } },
  { label: '3 months', get: () => [shiftMonths(2), todayInput()] },
  { label: '6 months', get: () => [shiftMonths(5), todayInput()] },
  { label: 'This year', get: () => [`${new Date().getFullYear()}-01-01`, todayInput()] },
]

function Chart({ title, children, sub }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="card" aria-label={title}>
      <h2 className="font-display text-lg font-extrabold">{title}</h2>
      {sub && <p className="text-xs text-ink/60 dark:text-white/60">{sub}</p>}
      <div className="mt-3 h-60">{children}</div>
    </section>
  )
}

export default function Analytics() {
  const { money } = useAuth()
  const [[from, to], setRange] = useState<[string, string]>([shiftMonths(5), todayInput()])
  const bad = from > to
  const { data, error, loading } = useApi<Report>(bad ? null : '/analytics/report' + qs({ from, to }))
  const exportQs = qs({ from, to })

  const axis = { tickLine: false, axisLine: false, fontSize: 12 } as const
  const grid = <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.12} />
  const yAxis = <YAxis tickFormatter={(v: number) => money(v, { compact: true })} {...axis} width={60} />
  const months = (data?.months ?? []).map((m) => ({ ...m, label: monthLabel(m.month) }))
  const empty = data && data.summary.transactions === 0

  return (
    <>
      <PageHeader title="Analytics & reports" sub="Every number here comes from your saved transactions." />
      <div className="card mb-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-bold uppercase tracking-wide">From<input type="date" className="input mt-1 !w-auto" value={from} max={to} onChange={(e) => e.target.value && setRange([e.target.value, to])} /></label>
          <label className="text-xs font-bold uppercase tracking-wide">To<input type="date" className="input mt-1 !w-auto" value={to} min={from} onChange={(e) => e.target.value && setRange([from, e.target.value])} /></label>
          <div className="flex flex-wrap gap-2">{PRESETS.map((p) => <button key={p.label} className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setRange(p.get() as [string, string])}>{p.label}</button>)}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className={`btn-primary !py-2 ${bad ? 'pointer-events-none opacity-50' : ''}`} href={`/api/analytics/export.csv${exportQs}`} download><Download size={15} /> Download CSV</a>
          <a className={`btn-ghost !py-2 ${bad ? 'pointer-events-none opacity-50' : ''}`} href={`/api/analytics/export.pdf${exportQs}`} download><FileText size={15} /> Download summary PDF</a>
        </div>
        {bad && <Notice tone="error">The start date must be before the end date.</Notice>}
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {loading && !data ? <Spinner /> : empty ? (
        <EmptyState title="No transactions in this range" body="Pick a wider date range, or add some transactions." />
      ) : data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Highest spending category', data.summary.topCategory ? `${data.summary.topCategory.category}` : '–', data.summary.topCategory ? money(data.summary.topCategory.total) : ''],
              ['Average daily spending', money(data.summary.avgDailySpend), `over ${data.range.days} days`],
              ['Savings rate', data.summary.savingsRate === null ? '–' : `${data.summary.savingsRate < 0 ? '−' : ''}${pct(data.summary.savingsRate)}`, data.summary.savingsRate === null ? 'No income in range' : 'of income saved'],
              ['Net savings', money(data.summary.net), `${money(data.summary.income, { compact: true })} in, ${money(data.summary.expense, { compact: true })} out`],
            ].map(([t, v, s]) => (
              <div key={t} className="card"><p className="text-xs font-bold uppercase tracking-wide text-ink/60 dark:text-white/60">{t}</p><p className="mt-1 font-display text-2xl font-extrabold tabular-nums">{v}</p><p className="text-xs text-ink/60 dark:text-white/60">{s}</p></div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink/60 dark:text-white/60">{formatDate(data.range.from)} to {formatDate(data.range.to)} · {data.summary.transactions} transactions</p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Chart title="Monthly income"><ResponsiveContainer><BarChart data={months} margin={{ left: -10 }}>{grid}<XAxis dataKey="label" {...axis} />{yAxis}<Tooltip formatter={(v: number) => money(v)} contentStyle={tip} /><Bar dataKey="income" name="Income" fill="#C9F227" stroke="#242424" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Chart>
            <Chart title="Monthly expenses"><ResponsiveContainer><BarChart data={months} margin={{ left: -10 }}>{grid}<XAxis dataKey="label" {...axis} />{yAxis}<Tooltip formatter={(v: number) => money(v)} contentStyle={tip} /><Bar dataKey="expense" name="Expenses" fill="#F28B45" stroke="#242424" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Chart>
            <Chart title="Income vs expenses"><ResponsiveContainer><BarChart data={months} margin={{ left: -10 }}>{grid}<XAxis dataKey="label" {...axis} />{yAxis}<Tooltip formatter={(v: number) => money(v)} contentStyle={tip} /><Legend /><Bar dataKey="income" name="Income" fill="#C9F227" stroke="#242424" radius={[6, 6, 0, 0]} /><Bar dataKey="expense" name="Expenses" fill="#F28B45" stroke="#242424" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Chart>
            <Chart title="Monthly savings trend" sub="Income minus expenses"><ResponsiveContainer><LineChart data={months} margin={{ left: -10 }}>{grid}<XAxis dataKey="label" {...axis} />{yAxis}<Tooltip formatter={(v: number) => money(v)} contentStyle={tip} /><Line type="monotone" dataKey="savings" name="Saved" stroke="#242424" strokeWidth={3} dot={{ r: 4, fill: '#C9F227', stroke: '#242424', strokeWidth: 2 }} /></LineChart></ResponsiveContainer></Chart>
            <Chart title="Spending by category">
              {data.categories.length === 0 ? <p className="py-16 text-center text-sm text-ink/60">No expenses in this range.</p> : (
                <ResponsiveContainer><BarChart data={data.categories} layout="vertical" margin={{ left: 10, right: 10 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" opacity={0.12} /><XAxis type="number" tickFormatter={(v: number) => money(v, { compact: true })} {...axis} /><YAxis type="category" dataKey="category" {...axis} width={90} /><Tooltip formatter={(v: number) => money(v)} contentStyle={tip} /><Bar dataKey="total" name="Spent" stroke="#242424" radius={[0, 6, 6, 0]}>{data.categories.map((c) => <Cell key={c.category} fill={colorFor(c.category)} />)}</Bar></BarChart></ResponsiveContainer>
              )}
            </Chart>
            <Chart title="Daily spending" sub={data.daily ? undefined : 'Daily view is available for ranges up to about a year.'}>
              {data.daily ? <ResponsiveContainer><AreaChart data={data.daily} margin={{ left: -10 }}>{grid}<XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} minTickGap={28} {...axis} />{yAxis}<Tooltip formatter={(v: number) => money(v)} labelFormatter={(d: string) => formatDate(d)} contentStyle={tip} /><Area type="monotone" dataKey="expense" name="Spent" stroke="#242424" strokeWidth={2} fill="#83CFF0" fillOpacity={0.6} /></AreaChart></ResponsiveContainer> : null}
            </Chart>
          </div>
        </>
      )}
      <div className="h-20" />
    </>
  )
}
