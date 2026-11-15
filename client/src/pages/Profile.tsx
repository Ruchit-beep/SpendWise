import { useState, type FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import type { User } from '../lib/types'
import { useAuth } from '../context/AuthContext'
import { Notice, PageHeader, TextAreaField, TextField } from '../components/ui'

export default function Profile() {
  const { user, setUser, logout } = useAuth()
  const [f, setF] = useState({ name: user!.name, email: user!.email, phone: user!.phone, occupation: user!.occupation, bio: user!.bio })
  const [fields, setFields] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }))

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    setFields({})
    try {
      const r = await api.put<{ user: User }>('/user/profile', f)
      setUser(r.user)
      setMsg({ tone: 'success', text: 'Profile saved.' })
    } catch (x) {
      setFields(x instanceof ApiError ? x.fields ?? {} : {})
      setMsg({ tone: 'error', text: x instanceof Error ? x.message : 'Could not save.' })
    } finally {
      setBusy(false)
    }
  }

  const initials = user!.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <>
      <PageHeader title="Profile" sub="Your details." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card text-center">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border-2 border-ink bg-pink font-display text-3xl font-extrabold text-ink">{initials}</div>
          <p className="mt-3 font-display text-xl font-extrabold">{user!.name}</p>
          <p className="text-sm text-ink/70 dark:text-white/70">{user!.email}</p>
          <p className="mt-2 font-hand text-xl text-orange">member since {new Date(user!.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
          <button className="btn-ghost mt-4 w-full" onClick={() => void logout()}>Log out</button>
        </div>
        <form onSubmit={save} className="card space-y-3 lg:col-span-2" noValidate>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Name" value={f.name} onChange={set('name')} error={fields.name} required />
            <TextField label="Email" type="email" value={f.email} onChange={set('email')} error={fields.email} required />
            <TextField label="Phone" type="tel" value={f.phone} onChange={set('phone')} />
            <TextField label="Occupation" value={f.occupation} onChange={set('occupation')} placeholder="Student, freelancer…" />
          </div>
          <TextAreaField label="About you" value={f.bio} onChange={set('bio')} maxLength={300} />
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
        </form>
      </div>
    </>
  )
}
