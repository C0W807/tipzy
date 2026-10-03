import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/store'

export type Query<T> = {
  data: T | undefined
  error: Error | undefined
  /** True only until the first answer; later refreshes keep showing the old data. */
  loading: boolean
  reload: () => Promise<void>
}

/**
 * Loads from the data layer and re-loads whenever it changes, here or in
 * another tab. That re-load is what makes a tip paid in one tab show up on the
 * dashboard in another.
 */
export function useQuery<T>(load: () => Promise<T>, deps: readonly unknown[]): Query<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<Error>()
  const [loading, setLoading] = useState(true)
  const loadRef = useRef(load)
  loadRef.current = load
  const alive = useRef(true)

  const reload = useCallback(async () => {
    try {
      const next = await loadRef.current()
      if (!alive.current) return
      setData(next)
      setError(undefined)
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    alive.current = true
    setLoading(true)
    void reload()
    const unsubscribe = api.subscribe(() => void reload())
    return () => {
      alive.current = false
      unsubscribe()
    }
  }, deps)

  return { data, error, loading, reload }
}
