import { useEffect, useState } from 'react'
import { qrSvg } from '../lib/images'
import { cx, Skeleton } from './ui'

/** A crisp SVG QR code that fills its box. Black on white: the most reliable scan. */
export function QrCode({ value, className, label }: { value: string; className?: string; label?: string }) {
  const [svg, setSvg] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!value) return
    let alive = true
    setFailed(false)
    qrSvg(value)
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [value])

  if (failed) {
    return (
      <div className={cx('grid place-items-center rounded-xl bg-paper-deep p-4 text-center text-sm text-mute', className)}>
        Couldn't draw the QR code. Use the link instead.
      </div>
    )
  }
  if (!value || !svg) return <Skeleton className={cx('aspect-square', className)} />
  return (
    <div
      role="img"
      aria-label={label ?? 'QR code'}
      className={cx('qr-box aspect-square', className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
