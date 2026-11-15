import { useState } from 'react'
import { Pencil, Search, Trash2 } from 'lucide-react'
import { api, qs } from '../lib/api'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../lib/constants'
import { formatDate } from '../lib/format'
import type { Transaction } from '../lib/types'
import { useApi, useDebounced } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { CategoryChip, EmptyState, Notice, PageHeader, SampleBadge, Spinner } from '../components/ui'
import TransactionModal from '../components/TransactionModal'

interface Res { items: Transaction[]; total: number; page: number; pages: number }
const ALL_CATS = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])]

export default function Transactions() {
  const { money, bump } = useAuth()
  const [q, setQ] = useState('')
  const [f, setF] = useState({ category: '', type: '', method: '', from: '', to: '', sort: 'date', order: 'desc' })
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [err, setErr] = useState('')
  const dq = useDebounced(q)
  const { data, error, loading } = useApi<Res>('/transactions' + qs({ q: dq, ...f, page, limit: 15 }))
  const set = (k: keyof typeof f) => (v: string) => { setF((p) => ({ ...p, [k]: v })); setPage(1) }
  const filtered = !!(dq || f.category || f.type || f.method || f.from || f.to)

  async function remove(t: Transaction) {
    if (!window.confirm(`Delete "${t.title}"? This can't be undone.`)) return
    try { await api.del(`/transactions/${t._id}`); bump() } catch (e) { setErr(e instanceof Error ? e.message : 'Could not delete.') }
  }

  const sel = 'input !py-2'
  return (
    <>
      <PageHeader title="Transactions" sub="Everything coming in and going out." />
      <div className="card mb-4 space-y-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input aria-label="Search transactions" className="input !pl-9" placeholder="Search by title or description" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
          <select aria-label="Type" className={sel} value={f.type} onChange={(e) => set('type')(e.target.value)}><option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option></select>
          <select aria-label="Category" className={sel} value={f.category} onChange={(e) => set('category')(e.target.value)}><option value="">All categories</option>{ALL_CATS.map((c) => <option key={c}>{c}</option>)}</select>
          <select aria-label="Payment method" className={sel} value={f.method} onChange={(e) => set('method')(e.target.value)}><option value="">All methods</option>{PAYMENT_METHODS.map((c) => <option key={c}>{c}</option>)}</select>
          <input aria-label="From date" type="date" className={sel} value={f.from} onChange={(e) => set('from')(e.target.value)} />
          <input aria-label="To date" type="date" className={sel} value={f.to} onChange={(e) => set('to')(e.target.value)} />
          <select aria-label="Sort by" className={sel} value={f.sort} onChange={(e) => set('sort')(e.target.value)}><option value="date">Sort: date</option><option value="amount">Sort: amount</option></select>
          <select aria-label="Order" className={sel} value={f.order} onChange={(e) => set('order')(e.target.value)}><option value="desc">High / newest first</option><option value="asc">Low / oldest first</option></select>
        </div>
        {filtered && <button className="text-sm font-bold underline" onClick={() => { setQ(''); setF({ category: '', type: '', method: '', from: '', to: '', sort: 'date', order: 'desc' }); setPage(1) }}>Clear filters</button>}
      </div>

      {(err || error) && <div className="mb-3"><Notice tone="error">{err || error}</Notice></div>}
      {loading && !data ? <Spinner /> : data && data.items.length === 0 ? (
        <EmptyState title={filtered ? 'No matches' : 'No transactions yet'} body={filtered ? 'Try different filters or clear them.' : 'Use the "+ Add Transaction" button to record your first one.'} />
      ) : data && (
        <>
          <p className="mb-2 text-sm text-ink/60 dark:text-white/60">{data.total} transaction{data.total === 1 ? '' : 's'}</p>
          <div className="card !p-0 overflow-hidden">
            <div className="hidden grid-cols-[1.6fr_1fr_.9fr_.9fr_1fr_72px] gap-3 border-b-2 border-ink/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink/60 dark:border-white/10 dark:text-white/60 md:grid">
              <span>Title</span><span>Category</span><span>Date</span><span>Method</span><span className="text-right">Amount</span><span />
            </div>
            <ul className="divide-y divide-ink/10 dark:divide-white/10">
              {data.items.map((t) => (
                <li key={t._id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[1.6fr_1fr_.9fr_.9fr_1fr_72px]">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-semibold">{t.title} {t.isDemo && <SampleBadge />}</p>
                    {t.description && <p className="truncate text-xs text-ink/60 dark:text-white/60">{t.description}</p>}
                  </div>
                  <p className={`text-right font-bold tabular-nums md:order-5 ${t.type === 'income' ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}><span className="sr-only">{t.type}</span>{t.type === 'income' ? '+' : '−'}{money(t.amount)}</p>
                  <div className="md:order-2"><CategoryChip category={t.category} /></div>
                  <p className="text-xs text-ink/70 dark:text-white/70 md:order-3 md:text-sm">{formatDate(t.date)}</p>
                  <p className="text-xs text-ink/70 dark:text-white/70 md:order-4 md:text-sm">{t.paymentMethod}</p>
                  <div className="flex justify-end gap-1 md:order-6">
                    <button aria-label={`Edit ${t.title}`} className="rounded-full p-2 hover:bg-ink/10 dark:hover:bg-white/10" onClick={() => setEditing(t)}><Pencil size={15} /></button>
                    <button aria-label={`Delete ${t.title}`} className="rounded-full p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-950" onClick={() => void remove(t)}><Trash2 size={15} /></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {data.pages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span className="text-sm">Page {data.page} of {data.pages}</span>
              <button className="btn-ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}
      <TransactionModal open={!!editing} editing={editing} onClose={() => setEditing(null)} />
      <div className="h-20" />
    </>
  )
}
