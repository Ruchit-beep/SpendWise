import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Notice, TextField } from '../components/ui'

function Shell({ title, sub, children, foot }: { title: string; sub: string; children: ReactNode; foot: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-lime/30 p-4 dark:bg-[#181818]">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-lime font-display text-xl font-extrabold">₹</span>
          <span className="font-anton text-2xl uppercase tracking-wide">SpendWise</span>
        </Link>
        <div className="card shadow-pop !p-7">
          <h1 className="font-display text-3xl font-extrabold">{title}</h1>
          <p className="mb-5 text-sm text-ink/70 dark:text-white/70">{sub}</p>
          {children}
        </div>
        <p className="mt-4 text-center text-sm">{foot}</p>
      </div>
    </div>
  )
}

function useSubmit(fn: () => Promise<void>) {
  const [err, setErr] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    setFields({})
    try {
      await fn()
      nav((loc.state as { from?: string } | null)?.from ?? '/app/dashboard', { replace: true })
    } catch (x) {
      if (x instanceof ApiError) {
        setErr(x.message)
        setFields(x.fields ?? {})
      } else setErr('Something went wrong.')
      setBusy(false)
    }
  }
  return { err, fields, busy, onSubmit }
}

export function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { err, fields, busy, onSubmit } = useSubmit(() => login(email, password))
  return (
    <Shell title="Welcome back" sub="Log in to see your money." foot={<>New here? <Link className="font-bold underline" to="/signup">Create an account</Link></>}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {err && <Notice tone="error">{err}</Notice>}
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} required />
        <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fields.password} required />
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </Shell>
  )
}

export function Signup() {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { err, fields, busy, onSubmit } = useSubmit(() => register(name, email, password))
  return (
    <Shell title="Get started free" sub="Money made simple. Takes under a minute." foot={<>Already have an account? <Link className="font-bold underline" to="/login">Log in</Link></>}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {err && <Notice tone="error">{err}</Notice>}
        <TextField label="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={fields.name} required />
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} required />
        <TextField label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fields.password} hint="At least 8 characters, with a letter and a number." required />
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </Shell>
  )
}
