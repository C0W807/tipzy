import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { defaultSiteBase } from '../hooks/useTipLink'
import { cleanHandleInput, handleProblem, shortUrl } from '../lib/links'
import { api } from '../lib/store'
import { cx, inputClass, Spinner } from './ui'

export type HandleStatus = 'idle' | 'checking' | 'ok' | 'bad'

/** The handle input with a live (mocked) availability check. */
export function HandleField({
  value,
  onChange,
  onStatus,
}: {
  value: string
  onChange: (h: string) => void
  onStatus: (s: HandleStatus) => void
}) {
  const [status, setStatus] = useState<HandleStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    setSuggestions([])
    const problem = handleProblem(value)
    if (problem) {
      setStatus('bad')
      setMessage(value ? problem : null)
      return
    }
    setStatus('checking')
    setMessage(null)
    let alive = true
    const t = setTimeout(async () => {
      const r = await api.checkHandle(value)
      if (!alive) return
      if (r.ok) {
        setStatus('ok')
      } else {
        setStatus('bad')
        setMessage(r.reason)
        setSuggestions(r.suggestions)
      }
    }, 300)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [value])

  useEffect(() => {
    onStatus(status)
  }, [status, onStatus])

  const base = shortUrl(defaultSiteBase())

  return (
    <div>
      <label htmlFor="handle" className="mb-1.5 block text-sm font-bold">
        Your handle
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base font-semibold text-mute">@</span>
        <input
          id="handle"
          className={cx(inputClass, 'pr-12 pl-9 font-semibold')}
          value={value}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          aria-invalid={status === 'bad' && !!message}
          aria-describedby="handle-status"
          onChange={(e) => onChange(cleanHandleInput(e.target.value))}
        />
        <span className="absolute top-1/2 right-4 -translate-y-1/2">
          {status === 'checking' && <Spinner className="size-5 text-mute" />}
          {status === 'ok' && <CircleCheck className="size-5 text-good" aria-hidden />}
          {status === 'bad' && message && <CircleAlert className="size-5 text-bad" aria-hidden />}
        </span>
      </div>
      <div id="handle-status" aria-live="polite" className="mt-1.5 min-h-5 text-sm">
        {status === 'checking' && <span className="text-mute">Checking…</span>}
        {status === 'ok' && <span className="font-semibold text-good">@{value} is yours</span>}
        {status === 'bad' && message && <span className="font-medium text-bad">{message}</span>}
        {status === 'idle' && <span className="text-mute">Letters, numbers and hyphens</span>}
      </div>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-sm text-mute">Try</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="h-8 rounded-full border border-line bg-card px-3 text-sm font-semibold hover:border-ink/30"
            >
              @{s}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 rounded-2xl bg-paper-deep px-4 py-3 text-sm">
        <p className="text-mute">Your tip link</p>
        <p className="mt-0.5 font-semibold break-all">
          {base}t/<span className="text-ink underline decoration-lime decoration-[3px] underline-offset-2 [text-decoration-skip-ink:none]">{value || 'your-handle'}</span>
        </p>
      </div>
    </div>
  )
}
