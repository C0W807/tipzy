import { useState } from 'react'
import { CalendarClock, Landmark, Zap } from 'lucide-react'
import { useToast } from '../components/toast'
import { Button, ButtonLink, ErrorState, PageHeader, Sheet, Skeleton } from '../components/ui'
import { useOwnProfile } from '../hooks/profile'
import { useQuery } from '../hooks/useQuery'
import { formatGBP } from '../lib/money'
import { api } from '../lib/store'
import { formatLongDay, formatShortDate } from '../lib/util'

export default function Payouts() {
  const profile = useOwnProfile()
  const q = useQuery(() => api.getPayouts(profile.handle), [profile.handle])
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [paying, setPaying] = useState(false)

  async function payOut() {
    setPaying(true)
    try {
      const p = await api.instantPayout(profile.handle)
      setConfirming(false)
      toast(`${formatGBP(p.amount)} paid out`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Payout failed. Try again.', 'bad')
    } finally {
      setPaying(false)
    }
  }

  const data = q.data
  const balance = Math.max(0, data?.balance ?? 0)

  return (
    <>
      <PageHeader title="Payouts" />
      <div className="space-y-4 px-4">
        {q.loading && !data && (
          <>
            <Skeleton className="h-48 rounded-[28px]" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </>
        )}
        {q.error && !data && <ErrorState title="Couldn't load payouts" onRetry={() => void q.reload()} />}

        {data && (
          <>
            <section className="rounded-[28px] bg-ink p-5 text-white">
              <p className="font-bold text-white/60">Balance</p>
              <p className="mt-1 text-[48px] leading-none font-extrabold tracking-[-0.03em] text-lime tabular-nums">{formatGBP(balance)}</p>
              {data.bank ? (
                <>
                  <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                    <CalendarClock className="size-5 text-white/60" aria-hidden />
                    <div className="text-sm">
                      <p className="font-bold">Next payout {formatLongDay(data.nextPayoutAt)}</p>
                      <p className="text-white/60">To account ending ••{data.bank.last2}</p>
                    </div>
                  </div>
                  <Button
                    variant="lime"
                    className="mt-4 w-full"
                    icon={<Zap className="size-5" />}
                    disabled={balance <= 0}
                    onClick={() => setConfirming(true)}
                  >
                    Pay out now
                  </Button>
                </>
              ) : (
                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-sm text-white/70">Connect a bank account and your balance is paid out every Monday.</p>
                  <ButtonLink to="/settings/bank" variant="lime" className="mt-3 w-full" icon={<Landmark className="size-5" />}>
                    Connect a bank
                  </ButtonLink>
                </div>
              )}
            </section>

            <p className="px-1 text-sm text-mute">
              Tips are paid every Monday for the week before. Card fees come off when a tip is made, so the balance is what you get.
            </p>

            <section>
              <h2 className="px-1 text-lg font-extrabold tracking-tight">History</h2>
              {data.payouts.length === 0 ? (
                <div className="mt-3 rounded-3xl border border-line bg-card px-6 py-8 text-center">
                  <p className="font-extrabold">No payouts yet</p>
                  <p className="mt-1 text-sm text-mute">
                    {data.bank ? `Your first one is on ${formatLongDay(data.nextPayoutAt)}.` : 'They start once a bank account is connected.'}
                  </p>
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-line rounded-3xl border border-line bg-card">
                  {data.payouts.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                      <span className="grid size-10 place-items-center rounded-full bg-paper-deep">
                        {p.kind === 'instant' ? <Zap className="size-[18px]" /> : <Landmark className="size-[18px]" />}
                      </span>
                      <div className="flex-1">
                        <p className="font-bold">{p.kind === 'instant' ? 'Instant payout' : 'Weekly payout'}</p>
                        <p className="text-sm text-mute">
                          {formatShortDate(p.createdAt)} · {data.bank ? `to ••${data.bank.last2}` : 'paid'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold tabular-nums">{formatGBP(p.amount)}</p>
                        <p className="text-xs font-bold text-good">Paid</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      <Sheet open={confirming} onClose={() => !paying && setConfirming(false)} title="Pay out now?" dismissible={!paying}>
        <p className="text-mute">
          {formatGBP(balance)} to account ending ••{data?.bank?.last2}. In a real version this would arrive within minutes; here it just moves
          your balance into the history.
        </p>
        <Button size="lg" className="mt-5 w-full" loading={paying} onClick={() => void payOut()}>
          Pay out {formatGBP(balance)}
        </Button>
      </Sheet>
    </>
  )
}
