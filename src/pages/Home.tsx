import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ChevronRight, Coins, ExternalLink, QrCode, Sparkles } from 'lucide-react'
import { Avatar } from '../components/brand'
import { AnimatedMoney, TipArrival, TipRow } from '../components/tips'
import { useToast } from '../components/toast'
import { Button, ButtonLink, cx, ErrorState, inputClass, Sheet, Skeleton } from '../components/ui'
import { useOwnProfile } from '../hooks/profile'
import { useQuery } from '../hooks/useQuery'
import { useTipLink } from '../hooks/useTipLink'
import { unlockAudio } from '../lib/chime'
import { formatGBP } from '../lib/money'
import { groupByDay, summarise } from '../lib/stats'
import { api } from '../lib/store'
import type { Tip } from '../lib/types'
import { formatShortDay, greeting } from '../lib/util'

const PAGE = 30
const SIM_AMOUNTS = [200, 300, 500, 1000, 2000]

export default function Home() {
  const profile = useOwnProfile()
  const tipsQ = useQuery(() => api.listTips(profile.handle), [profile.handle])
  const settingsQ = useQuery(api.getSettings, [])
  const payoutsQ = useQuery(() => api.getPayouts(profile.handle), [profile.handle])
  const link = useTipLink(profile)
  const toast = useToast()

  const [arrivals, setArrivals] = useState<Tip[]>([])
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set())
  const [shown, setShown] = useState(PAGE)
  const [simulating, setSimulating] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const known = useRef<Set<string> | null>(null)

  // Browsers only allow sound after a tap; the first tap anywhere unlocks it.
  useEffect(() => {
    const unlock = () => unlockAudio()
    document.addEventListener('pointerdown', unlock, { once: true })
    return () => document.removeEventListener('pointerdown', unlock)
  }, [])

  // A tip we haven't seen before, made in the last two minutes, is "arriving":
  // from the simulate button, or from the tip page in another tab.
  useEffect(() => {
    const tips = tipsQ.data
    if (!tips) return
    if (!known.current) {
      known.current = new Set(tips.map((t) => t.id))
      return
    }
    const seen = known.current
    const incoming = tips.filter((t) => !seen.has(t.id) && t.source !== 'demo' && Date.now() - Date.parse(t.createdAt) < 120_000)
    tips.forEach((t) => seen.add(t.id))
    if (incoming.length) {
      setArrivals((q) => [...q, ...incoming.reverse()])
      setFresh((f) => new Set([...f, ...incoming.map((t) => t.id)]))
    }
  }, [tipsQ.data])

  // A tip waiting to make its entrance stays out of the totals and feed until its
  // card has flown, so the numbers visibly count up and the row flashes in after.
  const pending = useMemo(() => new Set(arrivals.map((t) => t.id)), [arrivals])
  const visible = useMemo(() => (tipsQ.data ?? []).filter((t) => !pending.has(t.id)), [tipsQ.data, pending])
  const totals = useMemo(() => summarise(visible), [visible])
  const groups = useMemo(() => groupByDay(visible.slice(0, shown)), [visible, shown])

  async function simulate(opts?: { amount?: number; note?: string }) {
    setSimulating(true)
    setPickerOpen(false)
    try {
      await api.simulateTip(profile.handle, opts)
    } catch {
      toast("Couldn't send a test tip", 'bad')
    } finally {
      setSimulating(false)
    }
  }

  const tips = tipsQ.data ? visible : undefined
  const loading = tipsQ.loading && !tips

  return (
    <div className="px-4">
      {arrivals[0] && (
        <TipArrival tip={arrivals[0]} sound={settingsQ.data?.sound ?? true} onDone={() => setArrivals((q) => q.slice(1))} />
      )}

      <header className="flex items-center gap-3 px-1 pt-2 pb-4">
        <Avatar name={profile.name} seed={profile.handle} photo={profile.photo} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-mute">{greeting()}</p>
          <p className="truncate text-xl leading-tight font-extrabold tracking-tight">{profile.name.split(' ')[0]}</p>
        </div>
        <span className="rounded-full bg-paper-deep px-3 py-1.5 text-sm font-bold">@{profile.handle}</span>
      </header>

      {/* Totals */}
      <section className="rounded-[28px] bg-ink p-5 text-white" aria-label="Your tips">
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-4 w-20 rounded-md opacity-20" />
            <div className="skeleton h-12 w-40 rounded-lg opacity-20" />
            <div className="skeleton h-10 w-full rounded-lg opacity-20" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <p className="font-bold text-white/60">Today</p>
              <p className="text-sm text-white/60">
                {totals.todayCount} {totals.todayCount === 1 ? 'tip' : 'tips'}
              </p>
            </div>
            <AnimatedMoney pence={totals.today} className="mt-1 text-[52px] leading-none font-extrabold tracking-[-0.03em] text-lime" />
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
              <div>
                <p className="text-sm text-white/60">This week</p>
                <AnimatedMoney pence={totals.week} className="text-xl font-extrabold" />
              </div>
              <div>
                <p className="text-sm text-white/60">All time</p>
                <AnimatedMoney pence={totals.allTime} className="text-xl font-extrabold" />
              </div>
            </div>
          </>
        )}
      </section>

      <div className="mt-3 grid grid-cols-[1.4fr_1fr] gap-3">
        <ButtonLink to="/share/qr" variant="lime" size="lg" icon={<QrCode className="size-5" />}>
          Show my QR
        </ButtonLink>
        <ButtonLink to="/share" variant="ghost" size="lg">
          Share
        </ButtonLink>
      </div>

      {/* Demo tools */}
      <section className="mt-4 rounded-3xl border-2 border-dashed border-ink/15 p-4">
        <p className="text-xs font-extrabold tracking-[0.12em] text-mute uppercase">Demo tools</p>
        <Button className="mt-3 w-full" size="lg" loading={simulating} icon={<Sparkles className="size-5" />} onClick={() => void simulate()}>
          {simulating ? 'Tip on its way…' : 'Simulate incoming tip'}
        </Button>
        <div className="mt-2 flex items-center justify-between gap-2 text-sm">
          <button className="h-9 rounded-lg px-2 font-bold underline underline-offset-2 hover:bg-ink/5" onClick={() => setPickerOpen(true)}>
            Choose the amount
          </button>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 font-bold underline underline-offset-2 hover:bg-ink/5"
            >
              Open my tip page <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </div>
      </section>

      {/* Next payout */}
      {payoutsQ.data && (
        <Link to="/payouts" className="mt-4 flex items-center gap-3 rounded-3xl border border-line bg-card p-4 hover:border-ink/20">
          <span className="grid size-11 place-items-center rounded-2xl bg-paper-deep">
            <Coins className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            {payoutsQ.data.bank ? (
              <>
                <p className="font-bold">
                  {payoutsQ.data.balance > 0
                    ? `${formatGBP(payoutsQ.data.balance)} on ${formatShortDay(payoutsQ.data.nextPayoutAt)}`
                    : `Next payout ${formatShortDay(payoutsQ.data.nextPayoutAt)}`}
                </p>
                <p className="text-sm text-mute">
                  {payoutsQ.data.balance > 0 ? 'Next payout' : 'Nothing owed yet'} · account ••{payoutsQ.data.bank.last2}
                </p>
              </>
            ) : (
              <>
                <p className="font-bold">Connect a bank to get paid</p>
                <p className="text-sm text-mute">{formatGBP(Math.max(0, payoutsQ.data.balance))} waiting for you</p>
              </>
            )}
          </div>
          <ChevronRight className="size-5 text-mute" aria-hidden />
        </Link>
      )}

      {/* Feed */}
      <section className="mt-6" aria-label="Recent tips">
        <h2 className="px-1 text-lg font-extrabold tracking-tight">Recent tips</h2>
        {loading && (
          <div className="mt-3 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        )}
        {tipsQ.error && !tips && <ErrorState title="Couldn't load your tips" body="Your tips are safe. Try again in a moment." onRetry={() => void tipsQ.reload()} />}
        {tips && tips.length === 0 && (
          <div className="mt-3 flex flex-col items-center rounded-3xl border border-line bg-card px-6 py-10 text-center">
            <span className="grid size-16 place-items-center rounded-full border-2 border-dashed border-ink/20">
              <Coins className="size-7 text-mute" aria-hidden />
            </span>
            <p className="mt-4 text-lg font-extrabold">No tips yet</p>
            <p className="mt-1 max-w-[16rem] text-mute">Show your QR code to a customer, or simulate a tip to see one land.</p>
            <ButtonLink to="/share/qr" variant="ghost" className="mt-5" icon={<QrCode className="size-4" />}>
              Show my QR
            </ButtonLink>
          </div>
        )}
        {tips && tips.length > 0 && (
          <div className="mt-2 space-y-4">
            {groups.map((g) => (
              <div key={g.key}>
                <div className="flex items-baseline justify-between px-3 pb-1 text-sm">
                  <span className="font-bold text-mute">{g.label}</span>
                  <span className="font-semibold text-mute tabular-nums">{formatGBP(g.total)}</span>
                </div>
                <ul className="rounded-3xl border border-line bg-card p-1">
                  {g.tips.map((t) => (
                    <TipRow key={t.id} tip={t} fresh={fresh.has(t.id)} />
                  ))}
                </ul>
              </div>
            ))}
            {tips.length > shown && (
              <Button variant="ghost" className="w-full" onClick={() => setShown((n) => n + PAGE)}>
                Show more
              </Button>
            )}
          </div>
        )}
      </section>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Simulate a tip">
        <SimulatePicker onSend={(o) => void simulate(o)} />
      </Sheet>
    </div>
  )
}

function SimulatePicker({ onSend }: { onSend: (o: { amount?: number; note?: string }) => void }) {
  const [amount, setAmount] = useState<number | undefined>(500)
  const [note, setNote] = useState('')
  return (
    <div className="space-y-4">
      <p className="text-mute">Match what someone just tipped on their own phone, so it lands here too.</p>
      <div className="grid grid-cols-3 gap-2">
        {[undefined, ...SIM_AMOUNTS].map((a) => (
          <button
            key={a ?? 'random'}
            onClick={() => setAmount(a)}
            className={cx(
              'h-12 rounded-xl border text-[15px] font-extrabold transition',
              amount === a ? 'border-ink bg-ink text-white' : 'border-line bg-card hover:border-ink/30',
            )}
          >
            {a === undefined ? 'Random' : formatGBP(a, { trim: true })}
          </button>
        ))}
      </div>
      <input className={inputClass} placeholder="Note (optional)" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} />
      <Button size="lg" className="w-full" icon={<Sparkles className="size-5" />} onClick={() => onSend({ amount, note })}>
        Send test tip
      </Button>
    </div>
  )
}
