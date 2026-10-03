import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Sun, SunDim, X } from 'lucide-react'
import { Avatar, DemoPill } from '../components/brand'
import { QrCode } from '../components/QrCode'
import { cx } from '../components/ui'
import { useOwnProfile } from '../hooks/profile'
import { useTipLink } from '../hooks/useTipLink'
import { useWakeLock } from '../hooks/useWakeLock'
import { roleLine, shortUrl } from '../lib/links'

/** Full-screen, high-contrast QR for holding up to a customer. */
export default function ShowQr() {
  const profile = useOwnProfile()
  const link = useTipLink(profile)
  const wake = useWakeLock()
  const navigate = useNavigate()

  // White browser chrome to match, and fullscreen where the browser allows it (not iPhone Safari).
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const before = meta?.content
    if (meta) meta.content = '#ffffff'
    document.documentElement.requestFullscreen?.().catch(() => undefined)
    return () => {
      if (meta && before) meta.content = before
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    }
  }, [])

  const close = () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/home'))

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-white text-black">
      <div className="flex w-full max-w-[440px] items-center justify-between px-3 pt-[max(env(safe-area-inset-top),10px)]">
        <button onClick={close} className="grid size-12 place-items-center rounded-full bg-black/5" aria-label="Close">
          <X className="size-6" />
        </button>
        <span
          className={cx(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold',
            wake === 'on' ? 'bg-black text-white' : 'bg-black/5 text-black/70',
          )}
        >
          {wake === 'on' ? <Sun className="size-3.5" aria-hidden /> : <SunDim className="size-3.5" aria-hidden />}
          {wake === 'on' ? 'Screen stays on' : wake === 'pending' ? 'Keeping screen on…' : 'Turn off auto-lock to keep it on'}
        </span>
      </div>

      <div className="flex w-full max-w-[440px] flex-1 flex-col items-center justify-center px-6 py-4">
        <Avatar name={profile.name} seed={profile.handle} photo={profile.photo} size={64} />
        <p className="mt-3 text-center text-[32px] leading-tight font-extrabold tracking-tight">{profile.name}</p>
        <p className="text-center text-lg font-semibold text-black/60">{roleLine(profile.role, profile.venue)}</p>

        <div className="mt-6 w-[min(80vw,52dvh,360px)]">
          <QrCode value={link} label={`QR code for ${profile.name}'s tip page`} />
        </div>

        <p className="mt-6 text-2xl font-extrabold">Scan to leave a tip</p>
        <p className="mt-1 text-base font-medium text-black/60">Use your phone camera. No app needed.</p>
        <p className="mt-3 text-sm font-semibold text-black/45">{link ? shortUrl(link) : ''}</p>
      </div>

      <div className="pb-[max(env(safe-area-inset-bottom),16px)]">
        <DemoPill />
      </div>
    </div>
  )
}
