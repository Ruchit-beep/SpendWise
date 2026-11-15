import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { api } from '../lib/api'
import { colorFor } from '../lib/constants'
import { formatDate, monthLabel, pct } from '../lib/format'
import type { Dashboard as D, Insight } from '../lib/types'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { CategoryChip, EmptyState, Notice, ProgressBar, SampleBadge, Spinner } from '../components/ui'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function SummaryCard({ title, value, change, previous, icon: Icon, tone, goodWhenUp = true }: { title: string; value: number; change: number | null; previous: number; icon: typeof Wallet; tone: string; goodWhenUp?: boolean }) {
  const { money } = useAuth()
  const up = change !== null && change > 0
  const good = change === null || change === 0 ? null : up === goodWhenUp
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-ink/60 dark:text-white/60">{title}</p>
        <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink text-ink" style={{ background: tone }}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-2 font-display text-3xl font-extrabold tabular-nums">{money(value)}</p>
      <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${good === null ? 'text-ink/60 dark:text-white/60' : good ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {change === null ? (
          'No previous month to compare'
        ) : (
          <>
            {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {pct(change)} vs last month <span className="font-normal text-ink/50 dark:text-white/50">({money(previous, { compact: true })})</span>
          </>
        )}
      </p>
    </div>
  )
}

function insightText(i: Insight, money: (n: number) => string) {
  switch (i.kind) {
    case 'category_up': return `You spent ${money(i.amount)} more on ${i.category.toLowerCase()} this month than last month.`
    case 'category_down': return `Your ${i.category.toLowerCase()} spending is down ${money(i.amount)}${i.pct !== null ? ` (${pct(i.pct)})` : ''} compared with last month.`
    case 'budget_remaining': return `You have ${money(i.amount)} remaining in your monthly budget.`
    case 'budget_exceeded': return `You are ${money(i.amount)} over your monthly budget.`
    case 'top_category': return `${i.category} is your biggest expense this month at ${money(i.amount)}.`
    case 'savings_rate': return i.pct >= 0 ? `You have saved ${pct(i.pct)} of your income this month.` : `You have spent ${pct(i.pct)} more than you earned this month.`
  }
}

export default function Dashboard() {
  const { user, money, bump } = useAuth()
  const { openAdd } = useOutletContext<{ openAdd: () => void }>()
  const { data, error, loading } = useApi<D>('/analytics/dashboard')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function sample(load: boolean) {
    setBusy(true)
    setMsg('')
    try {
      if (load) await api.post('/demo')
      else if (window.confirm('Remove all sample data? Your own records stay untouched.')) await api.del('/demo')
      bump()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !data) return <Spinner />
  if (error && !data) return <Notice tone="error">{error}</Notice>
  if (!data) return null

  const first = user?.name.split(' ')[0] ?? ''
  const header = (
    <div className="mb-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{greeting()}, {first}!</h1>
      <p className="font-hand text-2xl text-orange">Here's your financial overview.</p>
    </div>
  )

  if (!data.hasData) {
    return (
      <>
        {header}
        <EmptyState
          title="Let's get your first numbers in"
          body="Add an income or expense to start. Everything here is calculated from what you enter. Want to look around first? Load clearly-labelled sample data and remove it with one click."
          action={
            <>
              <button className="btn-primary" onClick={openAdd}>+ Add Transaction</button>
              <button className="btn-ghost" disabled={busy} onClick={() => void sample(true)}>Load sample data</button>
            </>
          }
        />
        {msg && <div className="mt-3"><Notice tone="error">{msg}</Notice></div>}
      </>
    )
  }

  const c = data.cards
  const series = data.series.map((m) => ({ ...m, label: monthLabel(m.month) }))
  const hasSpend = data.categories.length > 0
  const total = data.categories.reduce((a, b) => a + b.total, 0)

  return (
    <>
      {header}
      {data.hasDemo && (
        <div className="mb-5">
          <Notice tone="info">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span><b>You're viewing sample data.</b> Numbers marked "Sample" are demonstration records, not yours.</span>
              <button className="btn-ghost !py-1.5 text-xs" disabled={busy} onClick={() => void sample(false)}>Remove sample data</button>
            </div>
          </Notice>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total balance" value={c.balance.value} previous={c.balance.previous} change={c.balance.change} icon={Wallet} tone="#C9F227" />
        <SummaryCard title="Income this month" value={c.income.value} previous={c.income.previous} change={c.income.change} icon={TrendingUp} tone="#83CFF0" />
        <SummaryCard title="Expenses this month" value={c.expense.value} previous={c.expense.previous} change={c.expense.change} icon={TrendingDown} tone="#F28B45" goodWhenUp={false} />
        <SummaryCard title="Monthly savings" value={c.savings.value} previous={c.savings.previous} change={c.savings.change} icon={PiggyBank} tone="#F4A3C7" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <section className="card lg:col-span-3" aria-label="Income versus expenses">
          <h2 className="font-display text-lg font-extrabold">Expense overview</h2>
          <p className="mb-3 text-xs text-ink/60 dark:text-white/60">Income vs expenses, last 6 months</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ left: -10, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.12} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickFormatter={(v: number) => money(v, { compact: true })} tickLine={false} axisLine={false} fontSize={12} width={60} />
                <Tooltip formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 12, border: '2px solid #242424', color: '#242424' }} />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#C9F227" stroke="#242424" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Expenses" fill="#F28B45" stroke="#242424" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card lg:col-span-2" aria-label="Spending breakdown">
          <h2 className="font-display text-lg font-extrabold">Spending breakdown</h2>
          <p className="mb-2 text-xs text-ink/60 dark:text-white/60">{monthLabel(data.month, true)}</p>
          {hasSpend ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.categories} dataKey="total" nameKey="category" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="#242424">
                      {data.categories.map((x) => <Cell key={x.category} fill={colorFor(x.category)} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 12, border: '2px solid #242424', color: '#242424' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {data.categories.map((x) => (
                  <li key={x.category} className="flex items-center justify-between gap-2">
                    <CategoryChip category={x.category} />
                    <span className="tabular-nums">{money(x.total)} <span className="text-xs text-ink/50 dark:text-white/50">{Math.round((x.total / total) * 100)}%</span></span>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className="py-10 text-center text-sm text-ink/60 dark:text-white/60">No expenses recorded this month.</p>}
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <section className="card lg:col-span-3" aria-label="Recent transactions">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold">Recent transactions</h2>
            <Link to="/app/transactions" className="text-sm font-bold underline">View all</Link>
          </div>
          {data.recent.length === 0 ? <p className="py-6 text-center text-sm text-ink/60">No transactions yet.</p> : (
            <ul className="divide-y divide-ink/10 dark:divide-white/10">
              {data.recent.map((t) => (
                <li key={t._id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-semibold">{t.title} {t.isDemo && <SampleBadge />}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/60 dark:text-white/60"><CategoryChip category={t.category} /> {formatDate(t.date)} · {t.paymentMethod}</p>
                  </div>
                  <p className={`shrink-0 font-bold tabular-nums ${t.type === 'income' ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    <span className="sr-only">{t.type}</span>{t.type === 'income' ? '+' : '−'}{money(t.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-4 lg:col-span-2">
          <section className="card" aria-label="Monthly budget">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold">Monthly budget</h2>
              <Link to="/app/budgets" className="text-sm font-bold underline">Manage</Link>
            </div>
            {data.budget ? (
              <>
                <div className="mb-2 flex justify-between text-sm"><span>Spent <b>{money(data.budget.spent)}</b></span><span>of {money(data.budget.limit)}</span></div>
                <ProgressBar pct={data.budget.pct} label="Monthly budget used" />
                <p className={`mt-2 text-sm font-semibold ${data.budget.remaining < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {data.budget.remaining >= 0 ? `${money(data.budget.remaining)} remaining` : `${money(-data.budget.remaining)} over budget`}
                </p>
                {data.budget.source === 'preference' && <p className="mt-1 text-xs text-ink/60 dark:text-white/60">Based on your monthly budget preference in Settings.</p>}
              </>
            ) : <p className="text-sm text-ink/70 dark:text-white/70">No budget set for this month. <Link to="/app/budgets" className="font-bold underline">Create one</Link></p>}
          </section>

          <section className="card" aria-label="Savings goals">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold">Savings goals</h2>
              <Link to="/app/goals" className="text-sm font-bold underline">All goals</Link>
            </div>
            {data.goals.length === 0 ? <p className="text-sm text-ink/70 dark:text-white/70">No active goals. <Link to="/app/goals" className="font-bold underline">Start one</Link></p> : (
              <ul className="space-y-4">
                {data.goals.map((g) => {
                  const p = (g.savedAmount / g.targetAmount) * 100
                  return (
                    <li key={g._id}>
                      <div className="flex items-baseline justify-between gap-2 text-sm"><span className="flex items-center gap-2 font-semibold">{g.name} {g.isDemo && <SampleBadge />}</span><span className="font-bold">{Math.round(p)}%</span></div>
                      <p className="mb-1 text-xs text-ink/60 dark:text-white/60">{money(g.savedAmount)} of {money(g.targetAmount)}</p>
                      <ProgressBar pct={p} tone="sky" label={`${g.name} progress`} />
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section className="card mt-6 !bg-lime/40 dark:!bg-lime/10" aria-label="Financial insights">
        <h2 className="font-display text-lg font-extrabold">Financial insights</h2>
        <p className="mb-2 text-xs text-ink/60 dark:text-white/60">Worked out from your transactions{data.hasDemo ? ' (including any sample data)' : ''}.</p>
        {data.insights.length === 0 ? <p className="text-sm">Add some income and expenses and insights will show up here.</p> : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.insights.map((i, n) => <li key={n} className="rounded-xl border-2 border-ink/20 bg-white/70 px-3 py-2 text-sm dark:bg-white/5">{insightText(i, money)}</li>)}
          </ul>
        )}
      </section>
    </>
  )
}
