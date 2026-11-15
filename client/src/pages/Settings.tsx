import { useState, type FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import { CURRENCIES } from '../lib/constants'
import type { Currency, Theme, User } from '../lib/types'
import { useAuth } from '../context/AuthContext'
import { Notice, PageHeader, SelectField, TextField } from '../components/ui'

export default function SettingsPage() {
  const { user, setUser, bump } = useAuth()
  const [prefs, setPrefs] = useState({ currency: user!.currency as Currency, theme: user!.theme as Theme, monthlyBudgetPref: String(user!.monthlyBudgetPref || '') })
  const [prefMsg, setPrefMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' })
  const [pwMsg, setPwMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [pwFields, setPwFields] = useState<Record<string, string>>({})
  const [demoMsg, setDemoMsg] = useState('')

  async function savePrefs(e: FormEvent) {
    e.preventDefault()
    setPrefMsg(null)
    try {
      const r = await api.put<{ user: User }>('/user/preferences', { currency: prefs.currency, theme: prefs.theme, monthlyBudgetPref: prefs.monthlyBudgetPref === '' ? 0 : Number(prefs.monthlyBudgetPref) })
      setUser(r.user)
      bump()
      setPrefMsg({ tone: 'success', text: 'Preferences saved.' })
    } catch (x) {
      setPrefMsg({ tone: 'error', text: x instanceof Error ? x.message : 'Could not save.' })
    }
  }

  async function savePw(e: FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    setPwFields({})
    try {
      await api.put('/user/password', pw)
      setPw({ currentPassword: '', newPassword: '' })
      setPwMsg({ tone: 'success', text: 'Password updated.' })
    } catch (x) {
      setPwFields(x instanceof ApiError ? x.fields ?? {} : {})
      setPwMsg({ tone: 'error', text: x instanceof Error ? x.message : 'Could not update password.' })
    }
  }

  async function demo(load: boolean) {
    setDemoMsg('')
    try {
      if (load) await api.post('/demo')
      else if (!window.confirm('Remove all sample data? Your own records stay untouched.')) return
      else await api.del('/demo')
      bump()
      setDemoMsg(load ? 'Sample data loaded. Look for the "Sample" badges.' : 'Sample data removed.')
    } catch (x) {
      setDemoMsg(x instanceof Error ? x.message : 'Failed.')
    }
  }

  return (
    <>
      <PageHeader title="Settings" sub="Make SpendWise yours." />
      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={savePrefs} className="card space-y-3" noValidate>
          <h2 className="font-display text-lg font-extrabold">Preferences</h2>
          {prefMsg && <Notice tone={prefMsg.tone}>{prefMsg.text}</Notice>}
          <SelectField label="Currency" value={prefs.currency} onChange={(e) => setPrefs((p) => ({ ...p, currency: e.target.value as Currency }))} hint="Changes how amounts are displayed everywhere. Amounts are not converted.">
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </SelectField>
          <SelectField label="Theme" value={prefs.theme} onChange={(e) => setPrefs((p) => ({ ...p, theme: e.target.value as Theme }))}>
            <option value="light">Light</option><option value="dark">Dark</option><option value="system">Match my device</option>
          </SelectField>
          <TextField label="Monthly budget preference" type="number" inputMode="decimal" min="0" step="1" value={prefs.monthlyBudgetPref} onChange={(e) => setPrefs((p) => ({ ...p, monthlyBudgetPref: e.target.value }))} hint="Used on the dashboard when you haven't set an overall budget for the month. 0 turns it off." />
          <button className="btn-primary">Save preferences</button>
        </form>

        <form onSubmit={savePw} className="card space-y-3" noValidate>
          <h2 className="font-display text-lg font-extrabold">Change password</h2>
          {pwMsg && <Notice tone={pwMsg.tone}>{pwMsg.text}</Notice>}
          <TextField label="Current password" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} error={pwFields.currentPassword} required />
          <TextField label="New password" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} error={pwFields.newPassword} hint="At least 8 characters, with a letter and a number." required />
          <button className="btn-primary">Update password</button>
        </form>

        <section className="card lg:col-span-2">
          <h2 className="font-display text-lg font-extrabold">Sample data</h2>
          <p className="mb-3 text-sm text-ink/70 dark:text-white/70">Want to explore with realistic numbers? Sample records are labelled "Sample" and removing them never touches anything you entered yourself.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => void demo(true)}>Load sample data</button>
            <button className="btn-danger" onClick={() => void demo(false)}>Remove sample data</button>
          </div>
          {demoMsg && <p role="status" className="mt-3 text-sm font-semibold">{demoMsg}</p>}
        </section>
      </div>
    </>
  )
}
