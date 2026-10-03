import { Navigate } from 'react-router'
import { ArrowRight, QrCode, ScanLine, Wallet } from 'lucide-react'
import { Avatar, DemoBadge, Logo, Splash } from '../components/brand'
import { QrCode as Qr } from '../components/QrCode'
import { ButtonLink } from '../components/ui'
import { useProfile } from '../hooks/profile'
import { defaultSiteBase } from '../hooks/useTipLink'
import { tipUrl } from '../lib/links'

const SAMPLE = { handle: 'maya', name: 'Maya Chen', role: 'Barista', venue: 'Kin Coffee' }

export default function Welcome() {
  const { profile, loading } = useProfile()
  if (loading) return <Splash />
  if (profile) return <Navigate to="/home" replace />

  const sampleUrl = tipUrl(defaultSiteBase(), SAMPLE)
  const samplePath = sampleUrl.slice(defaultSiteBase().length - 1)

  return (
    <div className="min-h-dvh bg-ink text-white">
      <DemoBadge tone="dark" />
      <div className="px-6 pt-4 pb-10">
        <Logo tone="dark" />
        <h1 className="mt-9 animate-rise text-[46px] leading-[0.98] font-extrabold tracking-[-0.035em]">
          Tips,
          <br />
          without
          <br />
          the <span className="text-lime">cash.</span>
        </h1>
        <p className="mt-5 max-w-[22rem] animate-rise text-lg text-white/70 [animation-delay:80ms]">
          Show your QR code. Customers scan it and tip from their phone in seconds. No app, no account.
        </p>

        {/* A real, scannable sample: point a second phone at it. */}
        <div className="relative mx-auto mt-9 w-[260px] animate-rise [animation-delay:160ms]">
          <div className="animate-float rounded-[26px] bg-white p-4 text-ink shadow-2xl">
            <div className="flex items-center gap-2.5">
              <Avatar name={SAMPLE.name} seed={SAMPLE.handle} size={38} />
              <div className="leading-tight">
                <p className="font-extrabold">{SAMPLE.name}</p>
                <p className="text-xs text-mute">Barista at Kin Coffee</p>
              </div>
            </div>
            <div className="mt-3 rounded-2xl border border-line p-3">
              <Qr value={sampleUrl} label="Sample QR code for Maya's tip page" />
            </div>
            <p className="mt-2.5 text-sm font-extrabold">Scan to leave a tip</p>
          </div>
          <div className="absolute -right-6 -bottom-6 rotate-3 rounded-2xl bg-lime px-4 py-2.5 text-ink shadow-xl">
            <p className="text-xs font-bold">New tip</p>
            <p className="text-2xl font-extrabold tracking-tight">+£5.00</p>
          </div>
        </div>

        <div className="mt-12 space-y-3">
          <ButtonLink to="/onboarding" variant="lime" size="lg" className="w-full">
            Create my tip page <ArrowRight className="size-5" />
          </ButtonLink>
          <ButtonLink to={samplePath} variant="glass" size="lg" className="w-full">
            See what customers see
          </ButtonLink>
        </div>
      </div>

      <section className="rounded-t-[32px] bg-paper px-6 pt-8 pb-[max(env(safe-area-inset-bottom),32px)] text-ink">
        <h2 className="text-2xl font-extrabold tracking-tight">How it works</h2>
        <ol className="mt-5 space-y-5">
          {[
            { Icon: QrCode, title: 'Set up in a minute', body: 'Your name, what you do and where your tips should go.' },
            { Icon: ScanLine, title: 'Show your code', body: 'On your phone, a printed card or an NFC tag. Customers scan or tap.' },
            { Icon: Wallet, title: 'Get tipped', body: 'They pick an amount and pay with a wallet or card. You see it land straight away.' },
          ].map(({ Icon, title, body }, i) => (
            <li key={title} className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ink text-lime">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-extrabold">
                  {i + 1}. {title}
                </p>
                <p className="text-mute">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 rounded-2xl bg-paper-deep p-4 text-sm text-mute">
          This is a clickable prototype. No money moves, nothing is sent anywhere, and everything you enter stays in this browser.
        </p>
      </section>
    </div>
  )
}
