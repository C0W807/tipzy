import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronRight, Copy, Download, ExternalLink, Maximize, Nfc, Printer, Share2 } from 'lucide-react'
import { TipCard } from '../components/TipCard'
import { useToast } from '../components/toast'
import { Button, ButtonLink, PageHeader } from '../components/ui'
import { useOwnProfile } from '../hooks/profile'
import { useTipLink } from '../hooks/useTipLink'
import { qrPoster } from '../lib/images'
import { roleLine } from '../lib/links'
import { copyText, downloadBlob } from '../lib/util'

export default function Share() {
  const profile = useOwnProfile()
  const link = useTipLink(profile)
  const toast = useToast()
  const [busy, setBusy] = useState<'png' | 'share' | null>(null)

  const posterFor = () =>
    qrPoster({ url: link, name: profile.name, role: roleLine(profile.role, profile.venue), handle: profile.handle, photo: profile.photo })

  async function download() {
    setBusy('png')
    try {
      downloadBlob(await posterFor(), `tipzy-${profile.handle}.png`)
      toast('QR code saved')
    } catch {
      toast("Couldn't make the image. Try again.", 'bad')
    } finally {
      setBusy(null)
    }
  }

  async function share() {
    setBusy('share')
    try {
      const file = new File([await posterFor()], `tipzy-${profile.handle}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Tip ${profile.name}`, text: link })
      } else if (navigator.share) {
        await navigator.share({ title: `Tip ${profile.name}`, url: link })
      } else {
        await copy()
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) toast("Couldn't open sharing. The link is copyable below.", 'bad')
    } finally {
      setBusy(null)
    }
  }

  async function copy() {
    toast((await copyText(link)) ? 'Link copied' : "Couldn't copy. Press and hold the link instead.", 'good')
  }

  return (
    <>
      <PageHeader title="Your QR code" />
      <div className="space-y-4 px-4">
        <TipCard profile={profile} url={link} />

        <ButtonLink to="/share/qr" variant="lime" size="lg" className="w-full" icon={<Maximize className="size-5" />}>
          Show full screen
        </ButtonLink>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" loading={busy === 'png'} disabled={!link} icon={<Download className="size-5" />} onClick={() => void download()}>
            Save PNG
          </Button>
          <Button variant="ghost" loading={busy === 'share'} disabled={!link} icon={<Share2 className="size-5" />} onClick={() => void share()}>
            Share
          </Button>
        </div>

        <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">
          <Row to="/share/card" icon={<Printer className="size-5" />} title="Print a card" body="A counter card, or a sheet of business cards" />
          <Row to="/share/nfc" icon={<Nfc className="size-5" />} title="Set up an NFC tag" body="Customers tap their phone instead of scanning" />
          <li>
            <a href={link} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 hover:bg-paper/60">
              <span className="grid size-11 place-items-center rounded-2xl bg-paper-deep">
                <ExternalLink className="size-5" />
              </span>
              <span className="flex-1">
                <span className="block font-bold">Preview your tip page</span>
                <span className="text-sm text-mute">Opens in a new tab, as customers see it</span>
              </span>
              <ChevronRight className="size-5 text-mute" aria-hidden />
            </a>
          </li>
        </ul>

        <div className="rounded-3xl border border-line bg-card p-4">
          <p className="text-sm font-bold">Your link</p>
          <p className="mt-1 font-mono text-[13px] break-all text-ink/80 select-all">{link || '…'}</p>
          <Button variant="ghost" size="sm" className="mt-3" icon={<Copy className="size-4" />} onClick={() => void copy()} disabled={!link}>
            Copy link
          </Button>
        </div>
      </div>
    </>
  )
}

function Row({ to, icon, title, body }: { to: string; icon: ReactNode; title: string; body: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 p-4 hover:bg-paper/60">
        <span className="grid size-11 place-items-center rounded-2xl bg-paper-deep">{icon}</span>
        <span className="flex-1">
          <span className="block font-bold">{title}</span>
          <span className="text-sm text-mute">{body}</span>
        </span>
        <ChevronRight className="size-5 text-mute" aria-hidden />
      </Link>
    </li>
  )
}
