import { avatarColours, initials } from '../lib/avatar'
import { cx } from './ui'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="18" fill="#d4ff3a" />
      <path d="M27 15v25c0 6 3.5 9 9 9h6" fill="none" stroke="#0c0d10" strokeWidth="8.5" strokeLinecap="round" />
      <path d="M19 27h23" stroke="#0c0d10" strokeWidth="8.5" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ tone = 'light', className }: { tone?: 'light' | 'dark'; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <LogoMark className="size-8" />
      <span className={cx('text-[22px] font-extrabold tracking-tight', tone === 'dark' ? 'text-white' : 'text-ink')}>
        tipzy
      </span>
    </span>
  )
}

export function DemoPill({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-bold whitespace-nowrap text-amber-900',
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
      Demo – no real payments
    </span>
  )
}

/** The strip at the top of every screen. */
export function DemoBadge({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <div
      className={cx(
        'sticky top-0 z-40 flex justify-center px-4 pt-[max(env(safe-area-inset-top),8px)] pb-2',
        tone === 'dark' ? 'bg-ink' : 'bg-paper/85 backdrop-blur-md',
      )}
    >
      <DemoPill />
    </div>
  )
}

export function Avatar({
  name,
  seed,
  photo,
  size = 48,
  className,
}: {
  name: string
  seed: string
  photo?: string
  size?: number
  className?: string
}) {
  const { bg, fg } = avatarColours(seed)
  const style = { width: size, height: size, fontSize: size * 0.38 }
  if (photo) {
    return <img src={photo} alt="" style={style} className={cx('shrink-0 rounded-full object-cover', className)} />
  }
  return (
    <span
      style={{ ...style, background: bg, color: fg }}
      className={cx('grid shrink-0 place-items-center rounded-full font-extrabold tracking-tight', className)}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

/** Full-screen centred mark while the first read comes back. */
export function Splash() {
  return (
    <div className="min-h-dvh">
      <DemoBadge />
      <div className="grid min-h-[70dvh] place-items-center">
        <LogoMark className="size-14 animate-pulse" />
      </div>
    </div>
  )
}
