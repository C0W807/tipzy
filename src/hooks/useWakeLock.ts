import { useEffect, useState } from 'react'

export type WakeLockState = 'pending' | 'on' | 'unsupported' | 'blocked'

/**
 * Keeps the screen awake while the QR is showing. The browser drops the lock
 * whenever the page is hidden, so it is taken again on return. Needs https (or
 * localhost): over plain http on a LAN it reports 'unsupported'.
 */
export function useWakeLock(): WakeLockState {
  const [state, setState] = useState<WakeLockState>('pending')

  useEffect(() => {
    if (!('wakeLock' in navigator) || !window.isSecureContext) {
      setState('unsupported')
      return
    }
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const request = async () => {
      try {
        const s = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void s.release()
          return
        }
        sentinel = s
        setState('on')
        s.addEventListener('release', () => {
          if (!cancelled) setState('pending')
        })
      } catch {
        if (!cancelled) setState('blocked')
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release().catch(() => undefined)
    }
  }, [])

  return state
}
