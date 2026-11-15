import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

interface GoogleId {
  accounts: { id: { initialize: (o: unknown) => void; renderButton: (el: HTMLElement, o: unknown) => void } }
}
declare global {
  interface Window {
    google?: GoogleId
  }
}

/** Renders Google's official sign-in button. Hidden unless the server has GOOGLE_CLIENT_ID set. */
export default function GoogleButton({ text }: { text: 'signin_with' | 'signup_with' }) {
  const { loginWithGoogle } = useAuth()
  const nav = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.get<{ googleClientId: string | null }>('/auth/config').then((r) => setClientId(r.googleClientId)).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    const init = () => {
      if (cancelled || !window.google || !ref.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp: { credential: string }) => {
          setErr('')
          try {
            await loginWithGoogle(resp.credential)
            nav('/app/dashboard', { replace: true })
          } catch (e) {
            setErr(e instanceof Error ? e.message : 'Google sign-in failed.')
          }
        },
      })
      window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', shape: 'pill', text, width: Math.min(360, Math.max(200, ref.current.clientWidth)) })
    }
    if (window.google) init()
    else {
      let s = document.getElementById('gsi-client') as HTMLScriptElement | null
      if (!s) {
        s = document.createElement('script')
        s.id = 'gsi-client'
        s.src = 'https://accounts.google.com/gsi/client'
        s.async = true
        document.head.appendChild(s)
      }
      s.addEventListener('load', init)
    }
    return () => {
      cancelled = true
    }
  }, [clientId, text, loginWithGoogle, nav])

  if (!clientId) return null
  return (
    <div className="mt-5">
      <div className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-ink/50 dark:text-white/50">
        <span className="h-px flex-1 bg-ink/20 dark:bg-white/20" /> or <span className="h-px flex-1 bg-ink/20 dark:bg-white/20" />
      </div>
      <div ref={ref} className="flex min-h-[44px] justify-center" />
      {err && <p role="alert" className="mt-2 text-center text-xs font-semibold text-red-600 dark:text-red-400">{err}</p>}
    </div>
  )
}
