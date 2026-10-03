import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, type LinkProps } from 'react-router'
import { ArrowLeft, CircleAlert, LoaderCircle, X } from 'lucide-react'

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ')
}

// ---- Buttons --------------------------------------------------------------

type Variant = 'ink' | 'lime' | 'ghost' | 'quiet' | 'danger' | 'glass'
type Size = 'lg' | 'md' | 'sm'

const VARIANTS: Record<Variant, string> = {
  ink: 'bg-ink text-white hover:bg-ink-soft disabled:bg-ink/35',
  lime: 'bg-lime text-ink hover:brightness-95 disabled:opacity-50',
  ghost: 'bg-card text-ink border border-line hover:border-ink/25 disabled:opacity-50',
  quiet: 'bg-transparent text-ink hover:bg-ink/5 disabled:opacity-50',
  danger: 'bg-bad text-white hover:brightness-95 disabled:opacity-50',
  glass: 'bg-white/10 text-white hover:bg-white/15 border border-white/15',
}
const SIZES: Record<Size, string> = {
  lg: 'h-14 px-6 text-[17px] rounded-2xl',
  md: 'h-12 px-5 text-[15px] rounded-xl',
  sm: 'h-9 px-3.5 text-sm rounded-lg',
}

export function buttonClass(variant: Variant = 'ink', size: Size = 'md', className?: string) {
  return cx(
    'inline-flex select-none items-center justify-center gap-2 font-bold tracking-[-0.01em] transition active:scale-[.98] disabled:cursor-not-allowed disabled:active:scale-100',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant, size, loading, icon, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button {...rest} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)}>
      {loading ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}

export function ButtonLink({
  variant,
  size,
  icon,
  className,
  children,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <Link {...rest} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  )
}

// ---- Form bits ------------------------------------------------------------

export const inputClass =
  'h-13 w-full rounded-xl border border-line bg-card px-4 text-base text-ink outline-none transition placeholder:text-mute/60 focus:border-ink focus:ring-4 focus:ring-ink/8 aria-invalid:border-bad aria-invalid:focus:ring-bad/10'

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string
  hint?: ReactNode
  error?: string | null
  children: ReactNode
  htmlFor?: string
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-bad">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-mute">{hint}</p>
      ) : null}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-8 w-13 shrink-0 rounded-full transition-colors', checked ? 'bg-ink' : 'bg-[#cdcbc2]')}
    >
      <span
        className={cx(
          'absolute top-1 left-1 size-6 rounded-full shadow-sm transition-transform',
          checked ? 'translate-x-5 bg-lime' : 'bg-white',
        )}
      />
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-paper-deep p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-10 rounded-lg px-3 text-sm font-bold transition',
            value === o.value ? 'bg-card text-ink shadow-sm' : 'text-mute hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ---- Feedback -------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton rounded-xl', className)} aria-hidden />
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cx('animate-spin', className ?? 'size-5')} aria-hidden />
}

export function ErrorState({ title, body, onRetry }: { title: string; body?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-bad/10 text-bad">
        <CircleAlert className="size-7" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-extrabold">{title}</h2>
      {body && <p className="mt-1 max-w-xs text-mute">{body}</p>}
      {onRetry && (
        <Button variant="ghost" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

// ---- Layout ---------------------------------------------------------------

export function PageHeader({ title, back, right }: { title: string; back?: string; right?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="flex h-14 items-center gap-2 px-3">
      {back ? (
        <button
          onClick={() => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate(back))}
          className="grid size-11 place-items-center rounded-full hover:bg-ink/5"
          aria-label="Back"
        >
          <ArrowLeft className="size-6" />
        </button>
      ) : (
        <span className="w-2" />
      )}
      <h1 className="flex-1 truncate text-xl font-extrabold tracking-tight">{title}</h1>
      {right}
    </header>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-3xl border border-line bg-card', className)}>{children}</div>
}

/** A bottom sheet. Not dismissible while something is in flight. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  dismissible = true,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  dismissible?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, dismissible, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 animate-fade bg-ink/55" onClick={dismissible ? onClose : undefined} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[92dvh] w-full max-w-[440px] animate-sheet overflow-y-auto rounded-t-[28px] bg-paper px-5 pt-2.5 pb-[max(env(safe-area-inset-bottom),20px)]"
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-ink/15" />
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
            {dismissible && (
              <button onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-ink/5" aria-label="Close">
                <X className="size-5" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
