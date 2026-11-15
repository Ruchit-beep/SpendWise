import { useEffect, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import { colorFor } from '../lib/constants'

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-2 border-ink bg-cream p-5 shadow-2xl dark:border-white/30 dark:bg-[#202020] sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-ink/10 dark:hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

interface FieldProps { label: string; error?: string; hint?: string }
export function Field({ label, error, hint, children, htmlFor }: FieldProps & { children: ReactNode; htmlFor: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink/70 dark:text-white/70">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink/60 dark:text-white/60">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
export function TextField({ label, error, hint, ...p }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id}>
      <input id={id} className="input" aria-invalid={!!error} {...p} />
    </Field>
  )
}
export function SelectField({ label, error, hint, children, ...p }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id}>
      <select id={id} className="input" aria-invalid={!!error} {...p}>
        {children}
      </select>
    </Field>
  )
}
export function TextAreaField({ label, error, hint, ...p }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id}>
      <textarea id={id} rows={3} className="input resize-y" aria-invalid={!!error} {...p} />
    </Field>
  )
}

export function ProgressBar({ pct, tone = 'auto', label }: { pct: number; tone?: 'auto' | 'lime' | 'sky'; label?: string }) {
  const w = Math.max(0, Math.min(100, pct))
  const color = tone === 'sky' ? 'bg-sky' : tone === 'lime' ? 'bg-lime' : pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange' : 'bg-lime'
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-3 w-full overflow-hidden rounded-full border-2 border-ink/80 bg-ink/5 dark:border-white/40 dark:bg-white/10">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${w}%` }} />
    </div>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'success'; children: ReactNode }) {
  const cls = { info: 'bg-sky/30', warn: 'bg-orange/25', error: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200', success: 'bg-lime/40' }[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border-2 border-ink/20 px-4 py-3 text-sm dark:border-white/20 dark:text-white ${cls}`}>
      {children}
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-ink/30 p-8 text-center dark:border-white/30">
      <p className="font-hand text-3xl text-orange">nothing here yet</p>
      <h3 className="mt-1 font-display text-lg font-extrabold">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink/70 dark:text-white/70">{body}</p>
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

export function Spinner() {
  return <div role="status" aria-label="Loading" className="mx-auto my-10 h-8 w-8 animate-spin rounded-full border-4 border-ink/20 border-t-lime dark:border-white/20" />
}

export function CategoryChip({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-semibold dark:bg-white/10">
      <span className="h-2 w-2 rounded-full" style={{ background: colorFor(category) }} />
      {category}
    </span>
  )
}

export const SampleBadge = () => <span className="rounded-full bg-pink px-2 py-0.5 text-[10px] font-bold uppercase text-ink">Sample</span>

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
        {sub && <p className="text-sm text-ink/70 dark:text-white/70">{sub}</p>}
      </div>
      {action}
    </div>
  )
}
