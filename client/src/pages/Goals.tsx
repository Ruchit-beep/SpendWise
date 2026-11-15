import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { formatDate, toInputDate } from '../lib/format'
import type { Goal } from '../lib/types'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { EmptyState, Modal, Notice, PageHeader, SampleBadge, Spinner, TextAreaField, TextField } from '../components/ui'

const PRESETS = ['New Laptop', 'Emergency Fund', 'Vacation', 'New Phone', 'Education']

function Ring({ pct }: { pct: number }) {
  const r = 38
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, pct))
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" role="img" aria-label={`${Math.round(pct)} percent saved`}>
      <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="12" />
      <circle cx="48" cy="48" r={r} fill="none" stroke={p >= 100 ? '#34D399' : '#83CFF0'} strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} transform="rotate(-90 48 48)" style={{ transition: 'stroke-dashoffset .6s' }} />
      <text x="48" y="54" textAnchor="middle" className="fill-current font-display" fontSize="20" fontWeight="800">{Math.round(pct)}%</text>
    </svg>
  )
}

function GoalModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Goal | null }) {
  const { bump } = useAuth()
  const [f, setF] = useState({ name: '', targetAmount: '', savedAmount: '', targetDate: '', description: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    setErr('')
    setF(editing ? { name: editing.name, targetAmount: String(editing.targetAmount), savedAmount: String(editing.savedAmount), targetDate: editing.targetDate ? toInputDate(editing.targetDate) : '', description: editing.description } : { name: '', targetAmount: '', savedAmount: '', targetDate: '', description: '' })
  }, [open, editing])
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const body = { ...f, targetAmount: f.targetAmount === '' ? NaN : Number(f.targetAmount), savedAmount: f.savedAmount === '' ? 0 : Number(f.savedAmount) }
      if (editing) await api.put(`/goals/${editing._id}`, body)
      else await api.post('/goals', body)
      bump()
      onClose()
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit goal' : 'New savings goal'}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        {err && <Notice tone="error">{err}</Notice>}
        {!editing && (
          <div className="flex flex-wrap gap-2" aria-label="Quick picks">
            {PRESETS.map((p) => <button type="button" key={p} onClick={() => setF((x) => ({ ...x, name: p }))} className="rounded-full border-2 border-ink/20 px-3 py-1 text-xs font-semibold hover:bg-lime/50 dark:border-white/20">{p}</button>)}
          </div>
        )}
        <TextField label="Goal name" value={f.name} onChange={set('name')} maxLength={80} required placeholder="Custom goal or pick one above" />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Target amount" type="number" inputMode="decimal" min="1" step="0.01" value={f.targetAmount} onChange={set('targetAmount')} required />
          <TextField label="Saved so far" type="number" inputMode="decimal" min="0" step="0.01" value={f.savedAmount} onChange={set('savedAmount')} />
        </div>
        <TextField label="Target date" type="date" value={f.targetDate} onChange={set('targetDate')} hint="Optional" />
        <TextAreaField label="Description" value={f.description} onChange={set('description')} maxLength={300} />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save goal'}</button>
        </div>
      </form>
    </Modal>
  )
}

function AddMoney({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { bump, money } = useAuth()
  const [amt, setAmt] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { setAmt(''); setErr('') }, [goal])
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!goal) return
    setBusy(true)
    setErr('')
    try {
      await api.post(`/goals/${goal._id}/contribute`, { amount: amt === '' ? NaN : Number(amt) })
      bump()
      onClose()
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={!!goal} onClose={onClose} title={`Add money to ${goal?.name ?? ''}`}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        {err && <Notice tone="error">{err}</Notice>}
        {goal && <p className="text-sm">Saved {money(goal.savedAmount)} of {money(goal.targetAmount)}. {money(Math.max(0, goal.targetAmount - goal.savedAmount))} to go.</p>}
        <TextField label="Amount" type="number" inputMode="decimal" min="0" step="0.01" value={amt} onChange={(e) => setAmt(e.target.value)} required autoFocus />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add money'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Goals() {
  const { money, bump } = useAuth()
  const { data, error, loading } = useApi<{ goals: Goal[] }>('/goals')
  const [modal, setModal] = useState<{ open: boolean; editing: Goal | null }>({ open: false, editing: null })
  const [adding, setAdding] = useState<Goal | null>(null)
  const [err, setErr] = useState('')
  const goals = data?.goals ?? []

  async function remove(g: Goal) {
    if (!window.confirm(`Delete "${g.name}"?`)) return
    try { await api.del(`/goals/${g._id}`); bump() } catch (e) { setErr(e instanceof Error ? e.message : 'Could not delete.') }
  }

  return (
    <>
      <PageHeader title="Savings goals" sub="Small deposits, big wins." action={<button className="btn-primary" onClick={() => setModal({ open: true, editing: null })}><Plus size={16} /> New goal</button>} />
      {(err || error) && <div className="mb-3"><Notice tone="error">{err || error}</Notice></div>}
      {loading && !data ? <Spinner /> : goals.length === 0 ? (
        <EmptyState title="No goals yet" body="Pick something to save for: a laptop, an emergency fund, a trip. Then add money whenever you can." action={<button className="btn-primary" onClick={() => setModal({ open: true, editing: null })}>Create your first goal</button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => {
            const p = (g.savedAmount / g.targetAmount) * 100
            const done = g.savedAmount >= g.targetAmount
            return (
              <article key={g._id} className="card flex gap-4">
                <div className="shrink-0 text-ink dark:text-white"><Ring pct={p} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="flex flex-wrap items-center gap-2 font-display text-lg font-extrabold">{g.name} {g.isDemo && <SampleBadge />}{done && <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold uppercase text-ink">Reached</span>}</h2>
                    <div className="flex shrink-0">
                      <button aria-label={`Edit ${g.name}`} className="rounded-full p-1.5 hover:bg-ink/10 dark:hover:bg-white/10" onClick={() => setModal({ open: true, editing: g })}><Pencil size={14} /></button>
                      <button aria-label={`Delete ${g.name}`} className="rounded-full p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-950" onClick={() => void remove(g)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <p className="text-sm tabular-nums"><b>{money(g.savedAmount)}</b> of {money(g.targetAmount)}</p>
                  {g.targetDate && <p className="text-xs text-ink/60 dark:text-white/60">Target: {formatDate(g.targetDate)}</p>}
                  {g.description && <p className="mt-1 line-clamp-2 text-xs text-ink/70 dark:text-white/70">{g.description}</p>}
                  <button className="btn-primary mt-3 !px-4 !py-1.5 text-xs" onClick={() => setAdding(g)}>+ Add money</button>
                </div>
              </article>
            )
          })}
        </div>
      )}
      <GoalModal open={modal.open} editing={modal.editing} onClose={() => setModal({ open: false, editing: null })} />
      <AddMoney goal={adding} onClose={() => setAdding(null)} />
      <div className="h-20" />
    </>
  )
}
