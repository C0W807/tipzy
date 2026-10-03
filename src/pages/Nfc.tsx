import { useState } from 'react'
import { Check, Copy, Nfc as NfcIcon, Smartphone } from 'lucide-react'
import { useToast } from '../components/toast'
import { Button, PageHeader } from '../components/ui'
import { useOwnProfile } from '../hooks/profile'
import { useTipLink } from '../hooks/useTipLink'
import { copyText } from '../lib/util'

// Web NFC exists only in Chrome on Android, and isn't in TypeScript's DOM types.
type NdefWriter = { write: (msg: { records: { recordType: 'url'; data: string }[] }) => Promise<void> }
declare global {
  interface Window {
    NDEFReader?: new () => NdefWriter
  }
}

const STEPS = [
  {
    title: 'Get a tag',
    body: 'NTAG213 or NTAG215 stickers or cards work with every recent phone. They are sold online in packs, and need no battery.',
  },
  {
    title: 'Write your link to it',
    body: 'Open a free NFC writing app (NFC Tools works on iPhone and Android). Choose Write, add a URL record, paste your link, then hold the tag to the back of your phone.',
  },
  {
    title: 'Lock it (optional)',
    body: "Most apps can lock a tag so nobody can overwrite it. You can't change it after that, so test it first.",
  },
  {
    title: 'Test it',
    body: 'Tap the tag with your phone. iPhone XS and later read tags without an app; on Android, NFC needs to be switched on.',
  },
]

export default function Nfc() {
  const profile = useOwnProfile()
  const link = useTipLink(profile)
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const [writing, setWriting] = useState<'idle' | 'waiting' | 'done' | 'failed'>('idle')
  const canWrite = typeof window !== 'undefined' && 'NDEFReader' in window

  async function copy() {
    if (await copyText(link)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      toast("Couldn't copy. Press and hold the link instead.", 'bad')
    }
  }

  async function writeTag() {
    if (!window.NDEFReader) return
    setWriting('waiting')
    try {
      await new window.NDEFReader().write({ records: [{ recordType: 'url', data: link }] })
      setWriting('done')
    } catch {
      setWriting('failed')
    }
  }

  return (
    <>
      <PageHeader title="NFC tag" back="/share" />
      <div className="space-y-5 px-4">
        <div className="flex items-center gap-4 rounded-3xl bg-ink p-5 text-white">
          <span className="relative grid size-16 shrink-0 place-items-center rounded-2xl bg-lime text-ink">
            <NfcIcon className="size-8" aria-hidden />
          </span>
          <div>
            <p className="text-lg font-extrabold">Let customers tap instead</p>
            <p className="text-sm text-white/70">A small sticker with a chip. Put it on the counter, your lanyard or the dashboard.</p>
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-card p-4">
          <p className="text-sm font-bold">The link to write</p>
          <p className="mt-1 font-mono text-[13px] break-all text-ink/80 select-all">{link || '…'}</p>
          <Button
            variant={copied ? 'lime' : 'ink'}
            className="mt-3 w-full"
            icon={copied ? <Check className="size-5" /> : <Copy className="size-5" />}
            onClick={() => void copy()}
            disabled={!link}
          >
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          {canWrite && (
            <div className="mt-3 border-t border-line pt-3">
              <Button variant="ghost" className="w-full" icon={<Smartphone className="size-5" />} loading={writing === 'waiting'} onClick={() => void writeTag()}>
                {writing === 'waiting' ? 'Hold a tag to your phone…' : 'Write to a tag now'}
              </Button>
              {writing === 'done' && <p className="mt-2 text-sm font-semibold text-good">Written. Tap the tag to test it.</p>}
              {writing === 'failed' && <p className="mt-2 text-sm font-semibold text-bad">That didn't work. Check NFC is on and try again.</p>}
            </div>
          )}
        </div>

        <ol className="space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-sm font-extrabold text-lime">{i + 1}</span>
              <div>
                <p className="font-extrabold">{s.title}</p>
                <p className="text-mute">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="rounded-2xl bg-paper-deep p-4 text-sm text-mute">
          A tag only holds your link, never payment details. Keep your QR code nearby too, for phones without NFC.
        </p>
      </div>
    </>
  )
}
