import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { CreditCard, Wallet } from 'lucide-react'
import { buzz, playChime } from '../lib/chime'
import { formatGBP } from '../lib/money'
import type { Tip } from '../lib/types'
import { formatTime } from '../lib/util'
import { cx } from './ui'

/** Counts from the old value to the new one, so a landing tip visibly adds up. */
export function AnimatedMoney({ pence, className }: { pence: number; className?: string }) {
  const [shown, setShown] = useState(pence)
  const current = useRef(pence)
  const [bumpKey, setBumpKey] = useState(0)

  useEffect(() => {
    const from = current.current
    if (from === pence) return
    if (pence > from) setBumpKey((k) => k + 1)
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 900)
      const eased = 1 - Math.pow(1 - p, 3)
      const v = Math.round(from + (pence - from) * eased)
      current.current = v
      setShown(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [pence])

  return (
    <span key={bumpKey} className={cx('inline-block tabular-nums', bumpKey > 0 && 'animate-bump', className)}>
      {formatGBP(shown)}
    </span>
  )
}

export function MethodIcon({ method, className }: { method: Tip['method']; className?: string }) {
  const Icon = method === 'wallet' ? Wallet : CreditCard
  return <Icon className={className} aria-hidden />
}

export function TipRow({ tip, fresh }: { tip: Tip; fresh?: boolean }) {
  return (
    <li className={cx('flex gap-3 rounded-2xl px-3 py-3', fresh && 'animate-flash')}>
      <span className={cx('grid size-10 shrink-0 place-items-center rounded-full', fresh ? 'bg-lime' : 'bg-paper-deep')}>
        <MethodIcon method={tip.method} className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-bold">
            Tip <span className="font-medium text-mute">· {formatTime(tip.createdAt)}</span>
          </p>
          <p className="font-extrabold tabular-nums">+{formatGBP(tip.net)}</p>
        </div>
        <div className="mt-0.5 flex items-start justify-between gap-3 text-sm">
          <p className="min-w-0 text-ink/75">{tip.note ? `“${tip.note}”` : <span className="text-mute">No note</span>}</p>
          {tip.coverFees ? (
            <span className="shrink-0 rounded-full bg-[#e3f4ea] px-2 py-0.5 text-xs font-bold text-good">Fees covered</span>
          ) : (
            <span className="shrink-0 text-xs text-mute tabular-nums">{formatGBP(tip.fee)} fee</span>
          )}
        </div>
      </div>
    </li>
  )
}

const CONFETTI_COLOURS = ['#0c0d10', '#ffffff', '#ff7a59', '#5b8cff', '#b07cff', '#ffb020']

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.4
        const dist = 90 + Math.random() * 120
        return {
          background: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
          animationDelay: `${Math.random() * 120}ms`,
          '--x': `${Math.cos(angle) * dist * 1.6}px`,
          '--y': `${Math.sin(angle) * dist}px`,
          '--r': `${Math.random() * 720 - 360}deg`,
        } as CSSProperties
      }),
    [],
  )
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      {pieces.map((style, i) => (
        <span key={i} className="confetti" style={style} />
      ))}
    </span>
  )
}

/** The card that drops in when a tip lands: confetti, chime and a buzz. */
export function TipArrival({ tip, sound, onDone }: { tip: Tip; sound: boolean; onDone: () => void }) {
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    if (sound) playChime()
    buzz()
    const t = setTimeout(() => done.current(), 3200)
    return () => clearTimeout(t)
  }, [tip.id, sound])

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-4 pt-[calc(max(env(safe-area-inset-top),8px)+40px)]">
      <button
        key={tip.id}
        onClick={() => done.current()}
        className="pointer-events-auto relative w-full max-w-[400px] animate-drop rounded-3xl bg-lime p-5 text-left text-ink shadow-[0_24px_60px_-12px_rgb(12_13_16/0.5)]"
        aria-live="assertive"
      >
        <Confetti />
        <span className="flex items-center gap-2 text-xs font-extrabold tracking-[0.12em] uppercase">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-ink/60" />
            <span className="relative inline-flex size-2 rounded-full bg-ink" />
          </span>
          New tip
        </span>
        <span className="mt-1 block text-5xl font-extrabold tracking-tight tabular-nums">+{formatGBP(tip.net)}</span>
        {tip.note && <span className="mt-2 block text-[15px] font-semibold">“{tip.note}”</span>}
        <span className="mt-2 flex items-center gap-1.5 text-sm text-ink/70">
          <MethodIcon method={tip.method} className="size-4" />
          {tip.method === 'wallet' ? 'Wallet' : 'Card'} · {tip.coverFees ? 'customer covered the fees' : `${formatGBP(tip.fee)} fee`}
        </span>
      </button>
    </div>,
    document.body,
  )
}
