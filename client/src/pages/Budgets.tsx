import { useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { EXPENSE_CATEGORIES } from '../lib/constants'
import { currentMonthKey, monthLabel } from '../lib/format'
import type { Budget } from '../lib/types'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { CategoryChip, EmptyState, Modal, Notice, PageHeader, ProgressBar, SampleBadge, SelectField, Spinner, TextField } from '../components/ui'

const OVERALL = 'Overall'

function BudgetModal({ open, onClose, month, editing, taken }: { open: boolean; onClose: () => void; month: string; editing: Budget | null; taken: string[] }) {
  const { bump } = useAuth()
  const available = [OVERALL, ...EXPENSE_CATEGORIES].filter((c) => !taken.includes(c) || c === editing?.category)
  const [category, setCategory] = useState(OVERALL)
  const [limit, setLimit] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    setErr('')
    setCategory(editing?.category ?? available[0] ?? OVERALL)
    setLimit(editing ? String(editing.limit) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const n = limit === '' ? NaN : Number(limit)
      if (editing) await api.put(`/budgets/${editing._id}`, { limit: n })
      else await api.post('/budgets', { month, category, limit: n })
      bump()
      onClose()
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit budget' : 'New budget'}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        {err && <Notice tone="error">{err}</Notice>}
        <p className="text-sm text-ink/70 dark:text-white/70">For {monthLabel(month, true)}</p>
        <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} disabled={!!editing} hint={category === OVERALL ? 'Overall covers all your expenses.' : undefined}>
          {available.map((c) => <option key={c} value={c}>{c === OVERALL ? 'Overall (all expenses)' : c}</option>)}
        </SelectField>
        <TextField label="Monthly limit" type="number" inputMode="decimal" min="1" step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} required />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save budget'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Budgets() {
  const { money, bump } = useAuth()
  const [month, setMonth] = useState(currentMonthKey())
  const [modal, setModal] = useState<{ open: boolean; editing: Budget | null }>({ open: false, editing: null })
  const [err, setErr] = useState('')
  const { data, error, loading } = useApi<{ budgets: Budget[] }>(`/budgets?month=${month}`)
  const budgets = data?.budgets ?? []
  const overall = budgets.find((b) => b.category === OVERALL)
  const exceeded = budgets.filter((b) => b.pct >= 100)
  const near = budgets.filter((b) => b.pct >= 80 && b.pct < 100)

  async function remove(b: Budget) {
    if (!window.confirm(`Delete the ${b.category} budget?`)) return
    try { await api.del(`/budgets/${b._id}`); bump() } catch (e) { setErr(e instanceof Error ? e.message : 'Could not delete.') }
  }

  const card = (b: Budget) => (
    <div key={b._id} className="card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {b.category === OVERALL ? <span className="font-display text-lg font-extrabold">Overall budget</span> : <CategoryChip category={b.category} />}
          {b.isDemo && <SampleBadge />}
          {b.pct >= 100 ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Exceeded</span> : b.pct >= 80 ? <span className="rounded-full bg-orange px-2 py-0.5 text-[10px] font-bold uppercase text-ink">Nearing limit</span> : null}
        </div>
        <div className="flex">
          <button aria-label={`Edit ${b.category} budget`} className="rounded-full p-2 hover:bg-ink/10 dark:hover:bg-white/10" onClick={() => setModal({ open: true, editing: b })}><Pencil size={15} /></button>
          <button aria-label={`Delete ${b.category} budget`} className="rounded-full p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-950" onClick={() => void remove(b)}><Trash2 size={15} /></button>
        </div>
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold tabular-nums">{money(b.spent)} <span className="text-base font-semibold text-ink/60 dark:text-white/60">of {money(b.limit)}</span></p>
      <div className="my-2"><ProgressBar pct={b.pct} label={`${b.category} budget used`} /></div>
      <p className={`text-sm font-semibold ${b.remaining < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{b.remaining >= 0 ? `${money(b.remaining)} remaining` : `${money(-b.remaining)} over`} · {Math.round(b.pct)}% used</p>
    </div>
  )

  return (
    <>
      <PageHeader title="Budgets" sub="Set limits, then watch them fill up." action={
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="Month" type="month" className="input !w-auto !py-2" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          <button className="btn-primary" onClick={() => setModal({ open: true, editing: null })}>+ New budget</button>
        </div>} />
      {(err || error) && <div className="mb-3"><Notice tone="error">{err || error}</Notice></div>}
      {exceeded.length > 0 && (
        <div className="mb-3"><Notice tone="error"><span className="flex items-center gap-2"><AlertTriangle size={16} /> Over budget: {exceeded.map((b) => `${b.category} (${money(-b.remaining)} over)`).join(', ')}.</span></Notice></div>
      )}
      {near.length > 0 && (
        <div className="mb-3"><Notice tone="warn">Nearing the limit: {near.map((b) => `${b.category} (${Math.round(b.pct)}%)`).join(', ')}.</Notice></div>
      )}
      {loading && !data ? <Spinner /> : budgets.length === 0 ? (
        <EmptyState title={`No budgets for ${monthLabel(month, true)}`} body="Start with an overall monthly budget, then add limits for categories like Food or Shopping." action={<button className="btn-primary" onClick={() => setModal({ open: true, editing: null })}>+ New budget</button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {overall && <div className="md:col-span-2">{card(overall)}</div>}
          {budgets.filter((b) => b.category !== OVERALL).map(card)}
        </div>
      )}
      <BudgetModal open={modal.open} editing={modal.editing} month={month} taken={budgets.map((b) => b.category)} onClose={() => setModal({ open: false, editing: null })} />
      <div className="h-20" />
    </>
  )
}
