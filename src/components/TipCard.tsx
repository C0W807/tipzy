import { roleLine, shortUrl } from '../lib/links'
import type { Profile } from '../lib/types'
import { Avatar } from './brand'
import { QrCode } from './QrCode'
import { cx } from './ui'

/** The on-screen version of the card a customer scans. */
export function TipCard({
  profile,
  url,
  className,
}: {
  profile: Pick<Profile, 'handle' | 'name' | 'role' | 'venue' | 'photo'>
  url: string
  className?: string
}) {
  return (
    <div className={cx('rounded-[28px] border border-line bg-card p-5 shadow-[0_12px_40px_-20px_rgb(12_13_16/0.35)]', className)}>
      <div className="flex items-center gap-3">
        <Avatar name={profile.name} seed={profile.handle} photo={profile.photo} size={48} />
        <div className="min-w-0">
          <p className="truncate text-lg leading-tight font-extrabold">{profile.name || 'Your name'}</p>
          <p className="truncate text-sm text-mute">{roleLine(profile.role, profile.venue) || 'Your role'}</p>
        </div>
      </div>
      <div className="mx-auto mt-5 w-full max-w-[240px] rounded-2xl border border-line p-4">
        <QrCode value={url} label={`QR code for ${profile.name}'s tip page`} />
      </div>
      <p className="mt-4 text-center text-base font-extrabold">Scan to leave a tip</p>
      <p className="mt-0.5 truncate text-center text-sm text-mute">{url ? shortUrl(url) : '…'}</p>
    </div>
  )
}
