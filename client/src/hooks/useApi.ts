import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

/** GET a path (null to skip). Re-fetches when the path changes or any data is mutated anywhere (version). */
export function useApi<T>(path: string | null) {
  const { version } = useAuth()
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(path !== null)
  const seq = useRef(0)

  const load = useCallback(async () => {
    if (path === null) return
    const id = ++seq.current
    setLoading(true)
    try {
      const r = await api.get<T>(path)
      if (id === seq.current) {
        setData(r)
        setError('')
      }
    } catch (e) {
      if (id === seq.current) setError(e instanceof Error ? e.message : 'Failed to load.')
    } finally {
      if (id === seq.current) setLoading(false)
    }
  }, [path])

  useEffect(() => {
    void load()
  }, [load, version])

  return { data, error, loading, reload: load }
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
