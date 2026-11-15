import { useEffect, useState, type FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../lib/constants'
import { todayInput, toInputDate } from '../lib/format'
import type { Transaction } from '../lib/types'
import { useAuth } from '../context/AuthContext'
import { Modal, Notice, SelectField, TextAreaField, TextField } from './ui'

const blank = () => ({ title: '', amount: '', type: 'expense' as 'income' | 'expense', category: 'Food', date: todayInput(), paymentMethod: 'UPI', description: '', notes: '' })

export default function TransactionModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: Transaction | null }) {
  const { bump } = useAuth()
  const [f, setF] = useState(blank())
  const [err, setErr] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setErr('')
    setFields({})
    setF(editing ? { title: editing.title, amount: String(editing.amount), type: editing.type, category: editing.category, date: toInputDate(editing.date), paymentMethod: editing.paymentMethod, description: editing.description, notes: editing.notes } : blank())
  }, [open, editing])

  const cats = f.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }))
  const setType = (type: 'income' | 'expense') => setF((p) => ({ ...p, type, category: (type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).includes(p.category) ? p.category : type === 'expense' ? 'Food' : 'Salary' }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    setFields({})
    try {
      const body = { ...f, amount: f.amount === '' ? NaN : Number(f.amount) }
      if (editing) await api.put(`/transactions/${editing._id}`, body)
      else await api.post('/transactions', body)
      bump()
      onClose()
    } catch (x) {
      if (x instanceof ApiError) {
        setErr(x.message)
        setFields(x.fields ?? {})
      } else setErr('Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit transaction' : 'Add transaction'}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        {err && <Notice tone="error">{err}</Notice>}
        <div role="group" aria-label="Type" className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as const).map((t) => (
            <button type="button" key={t} aria-pressed={f.type === t} onClick={() => setType(t)} className={`rounded-xl border-2 py-2 text-sm font-bold capitalize ${f.type === t ? (t === 'expense' ? 'border-ink bg-orange text-ink' : 'border-ink bg-lime text-ink') : 'border-ink/20 dark:border-white/20'}`}>
              {t}
            </button>
          ))}
        </div>
        <TextField label="Title" value={f.title} onChange={set('title')} error={fields.title} maxLength={120} placeholder="e.g. Groceries" required />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Amount" type="number" inputMode="decimal" min="0" step="0.01" value={f.amount} onChange={set('amount')} error={fields.amount} placeholder="0.00" required />
          <TextField label="Date" type="date" value={f.date} onChange={set('date')} error={fields.date} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Category" value={f.category} onChange={set('category')} error={fields.category}>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </SelectField>
          <SelectField label="Payment method" value={f.paymentMethod} onChange={set('paymentMethod')} error={fields.paymentMethod}>
            {PAYMENT_METHODS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </SelectField>
        </div>
        <TextField label="Description" value={f.description} onChange={set('description')} maxLength={300} placeholder="Optional" />
        <TextAreaField label="Notes" value={f.notes} onChange={set('notes')} maxLength={500} placeholder="Optional" />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add transaction'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
