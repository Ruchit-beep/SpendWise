import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Notice, TextField } from '../components/ui'
import GoogleButton from '../components/GoogleButton'

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
        <div className="text-right"><Link to="/forgot-password" className="text-sm font-bold underline">Forgot password?</Link></div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <GoogleButton text="signin_with" />
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
      <GoogleButton text="signup_with" />
    </Shell>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState(false)
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      setSent((await api.post<{ message: string }>('/auth/forgot', { email })).message)
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Shell title="Forgot password?" sub="Enter your email and we'll send you a reset link." foot={<Link className="font-bold underline" to="/login">Back to log in</Link>}>
      {sent ? (
        <Notice tone="success">{sent} Check your spam folder if it doesn't show up.</Notice>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {err && <Notice tone="error">{err}</Notice>}
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
    </Shell>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const [token] = useState(() => params.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  // Keep the one-time token out of the address bar and browser history.
  useEffect(() => {
    if (token) window.history.replaceState(null, '', window.location.pathname)
  }, [token])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    setFields({})
    if (password !== confirm) return setFields({ confirm: 'Passwords do not match.' })
    setBusy(true)
    try {
      await api.post('/auth/reset', { token, password })
      setDone(true)
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
    <Shell title="Choose a new password" sub="Make it something you haven't used elsewhere." foot={<Link className="font-bold underline" to="/login">Back to log in</Link>}>
      {done ? (
        <div className="space-y-4">
          <Notice tone="success">Password updated. You can log in with it now.</Notice>
          <Link to="/login" className="btn-primary w-full">Go to log in</Link>
        </div>
      ) : !token ? (
        <div className="space-y-4">
          <Notice tone="error">This reset link is missing its token. Please request a new one.</Notice>
          <Link to="/forgot-password" className="btn-primary w-full">Request a new link</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {err && <Notice tone="error">{err}</Notice>}
          <TextField label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fields.password} hint="At least 8 characters, with a letter and a number." required />
          <TextField label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={fields.confirm} required />
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
        </form>
      )}
    </Shell>
  )
}
