import { useLayoutEffect, useRef, useState } from 'react'
import { Printer } from 'lucide-react'
import { Avatar, LogoMark } from '../components/brand'
import { QrCode } from '../components/QrCode'
import { Button, PageHeader, Segmented } from '../components/ui'
import { useOwnProfile } from '../hooks/profile'
import { useTipLink } from '../hooks/useTipLink'
import { roleLine, shortUrl } from '../lib/links'
import type { Profile } from '../lib/types'

type Layout = 'counter' | 'business'

// Everything in the print area is in millimetres, so it prints at true size.
const PAGE = {
  counter: { w: 105, h: 148 },
  business: { w: 210, h: 297 },
} as const
const PX_PER_MM = 96 / 25.4

export default function PrintCard() {
  const profile = useOwnProfile()
  const link = useTipLink(profile)
  const [layout, setLayout] = useState<Layout>('counter')
  const frame = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.8)
  const page = PAGE[layout]

  // Scale the true-size page down to fit the screen.
  useLayoutEffect(() => {
    const el = frame.current
    if (!el) return
    const fit = () => setScale(Math.min(1, el.clientWidth / (page.w * PX_PER_MM)))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [page.w])

  return (
    <>
      {/* Millimetres, not "A6": browsers only promise a few named page sizes. */}
      <style>{`@page { size: ${page.w}mm ${page.h}mm; margin: 0 }`}</style>
      <PageHeader title="Printable card" back="/share" />
      <div className="space-y-4 px-4">
        <Segmented
          label="Card layout"
          value={layout}
          onChange={setLayout}
          options={[
            { value: 'counter', label: 'Counter card (A6)' },
            { value: 'business', label: '8 cards on A4' },
          ]}
        />

        <div ref={frame} className="overflow-hidden rounded-2xl bg-paper-deep p-0">
          <div style={{ height: page.h * PX_PER_MM * scale }}>
            <div
              className="print-area origin-top-left bg-white shadow-sm"
              style={{ width: `${page.w}mm`, height: `${page.h}mm`, transform: `scale(${scale})` }}
            >
              {layout === 'counter' ? <CounterCard profile={profile} url={link} /> : <BusinessSheet profile={profile} url={link} />}
            </div>
          </div>
        </div>

        <Button size="lg" className="w-full" icon={<Printer className="size-5" />} onClick={() => window.print()} disabled={!link}>
          Print
        </Button>
        <p className="px-1 text-sm text-mute">
          Print at 100% scale (not "fit to page"). Thick card stock looks best. On a phone, Print opens the share sheet, where you can also
          save it as a PDF.
        </p>
      </div>
    </>
  )
}

type CardProps = { profile: Profile; url: string }

function CounterCard({ profile, url }: CardProps) {
  return (
    <div className="flex h-full flex-col text-ink">
      <div className="flex items-center justify-between bg-ink px-[7mm] py-[4.5mm]">
        <span className="flex items-center gap-[2mm]">
          <LogoMark className="size-[7mm]" />
          <span className="text-[5mm] font-extrabold tracking-tight text-white">tipzy</span>
        </span>
        <span className="text-[2.6mm] font-bold tracking-wide text-[#ffb020] uppercase">Demo – no real payments</span>
      </div>
      <div className="flex flex-1 flex-col items-center px-[8mm] pt-[6mm] text-center">
        <Avatar name={profile.name} seed={profile.handle} photo={profile.photo} size={52} />
        <p className="mt-[2.5mm] text-[7mm] leading-tight font-extrabold tracking-tight">Tip {profile.name.split(' ')[0]}</p>
        <p className="text-[3.6mm] font-semibold text-mute">{roleLine(profile.role, profile.venue)}</p>
        <div className="mt-[5mm] w-[58mm] rounded-[4mm] border-[0.4mm] border-line p-[4mm]">
          <QrCode value={url} />
        </div>
        <p className="mt-[5mm] text-[5mm] font-extrabold">Scan to leave a tip</p>
        <p className="text-[3.2mm] font-medium text-mute">Phone camera · no app or account</p>
        <p className="mt-auto pb-[5mm] text-[2.8mm] font-semibold text-mute">{shortUrl(url)}</p>
      </div>
    </div>
  )
}

function BusinessCard({ profile, url }: CardProps) {
  return (
    <div className="flex h-[55mm] w-[85mm] items-center gap-[4mm] border-[0.2mm] border-dashed border-[#c9c7bd] p-[5mm] text-ink">
      <div className="w-[36mm] shrink-0">
        <QrCode value={url} />
      </div>
      <div className="flex h-full min-w-0 flex-col">
        <span className="flex items-center gap-[1.5mm]">
          <LogoMark className="size-[5mm]" />
          <span className="text-[3.6mm] font-extrabold tracking-tight">tipzy</span>
        </span>
        <p className="mt-auto text-[4.6mm] leading-tight font-extrabold">{profile.name}</p>
        <p className="text-[2.8mm] leading-snug font-semibold text-mute">{roleLine(profile.role, profile.venue)}</p>
        <p className="mt-[2.5mm] text-[3.4mm] font-extrabold">Scan to tip</p>
        <p className="mt-auto text-[2.2mm] font-bold text-[#a86a00] uppercase">Demo – no real payments</p>
      </div>
    </div>
  )
}

function BusinessSheet(props: CardProps) {
  return (
    <div className="grid h-full place-items-center">
      <div className="grid grid-cols-2">
        {Array.from({ length: 8 }, (_, i) => (
          <BusinessCard key={i} {...props} />
        ))}
      </div>
    </div>
  )
}
