import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ArrowRight, Check, CircleAlert, CreditCard, Lock, Wallet } from 'lucide-react'
import { Avatar, DemoBadge, Logo } from '../components/brand'
import { Button, ButtonLink, cx, inputClass, Segmented, Sheet, Skeleton, Switch } from '../components/ui'
import { useQuery } from '../hooks/useQuery'
import { firstName } from '../lib/links'
import {
  FEE_FIXED_PENCE,
  FEE_PERCENT,
  feeBreakdown,
  formatGBP,
  MAX_TIP_PENCE,
  MIN_TIP_PENCE,
  parsePounds,
  PRESET_TIPS_PENCE,
  tipProblem,
  type FeeBreakdown,
} from '../lib/money'
import { api, PaymentDeclinedError } from '../lib/store'
import type { PaymentMethod, Recipient, Tip } from '../lib/types'
import { formatDateTime, sleep } from '../lib/util'

const DEMO_CARDS = {
  approve: { number: '4242 4242 4242 4242', last4: '4242' },
  decline: { number: '4000 0000 0000 0002', last4: '0002' },
} as const

/** The public page behind the QR code: /t/:handle?n=<name>&r=<role>. */
export default function TipPage() {
  const { handle = '' } = useParams()
  const { search } = useLocation()
  const recipient = useQuery(() => api.getRecipient(handle, search), [handle, search])
  const [receipt, setReceipt] = useState<{ tip: Tip; last4?: string } | null>(null)

  return (
    <div className="min-h-dvh">
      <DemoBadge />
      <div className="flex justify-center pt-1 pb-2">
        <Logo />
      </div>
      {recipient.loading && !recipient.data ? (
        <RecipientSkeleton />
      ) : !recipient.data ? (
        <BadLink />
      ) : receipt ? (
        <ThankYou recipient={recipient.data} tip={receipt.tip} last4={receipt.last4} onAgain={() => setReceipt(null)} />
      ) : (
        <ChooseTip
          recipient={recipient.data}
          onPaid={(tip, last4) => {
            setReceipt({ tip, last4 })
            window.scrollTo(0, 0)
          }}
        />
      )}
    </div>
  )
}

function RecipientSkeleton() {
  return (
    <div className="flex flex-col items-center px-6 pt-6" aria-label="Loading">
      <Skeleton className="size-24 rounded-full" />
      <Skeleton className="mt-4 h-7 w-44" />
      <Skeleton className="mt-2 h-5 w-32" />
      <div className="mt-10 grid w-full grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <Skeleton className="mt-4 h-28 w-full rounded-3xl" />
    </div>
  )
}

function BadLink() {
  return (
    <div className="flex flex-col items-center px-8 pt-16 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-bad/10 text-bad">
        <CircleAlert className="size-8" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold tracking-tight">This tip link isn't working</h1>
      <p className="mt-2 text-mute">It may have been cut short when it was copied. Ask them to show their QR code again and scan it with your camera.</p>
      <ButtonLink to="/" variant="ghost" className="mt-6">
        What is Tipzy?
      </ButtonLink>
    </div>
  )
}

function RecipientHeader({ recipient }: { recipient: Recipient }) {
  return (
    <div className="flex flex-col items-center px-6 pt-4 text-center">
      <Avatar name={recipient.name} seed={recipient.handle} photo={recipient.photo} size={96} className="ring-4 ring-white" />
      <h1 className="mt-3 text-[28px] leading-tight font-extrabold tracking-tight">{recipient.name}</h1>
      {recipient.role && <p className="text-lg font-medium text-mute">{recipient.role}</p>}
    </div>
  )
}

function ChooseTip({ recipient, onPaid }: { recipient: Recipient; onPaid: (tip: Tip, last4?: string) => void }) {
  const [choice, setChoice] = useState<number | 'custom'>(300)
  const [custom, setCustom] = useState('')
  const [customTouched, setCustomTouched] = useState(false)
  const [cover, setCover] = useState(true)
  const [note, setNote] = useState('')
  const [paying, setPaying] = useState(false)
  const customRef = useRef<HTMLInputElement>(null)

  const amount = choice === 'custom' ? parsePounds(custom) : choice
  const problem = tipProblem(amount)
  const fb = !problem && amount !== null ? feeBreakdown(amount, cover) : null
  const who = firstName(recipient.name)

  useEffect(() => {
    if (choice === 'custom') customRef.current?.focus()
  }, [choice])

  return (
    <div className="pb-[calc(110px+env(safe-area-inset-bottom))]">
      <RecipientHeader recipient={recipient} />

      <div className="mt-8 space-y-4 px-5">
        <section aria-labelledby="amount-label">
          <h2 id="amount-label" className="mb-2 font-extrabold">
            Choose a tip
          </h2>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-labelledby="amount-label">
            {PRESET_TIPS_PENCE.map((p) => (
              <AmountChip key={p} selected={choice === p} onClick={() => setChoice(p)}>
                {formatGBP(p, { trim: true })}
              </AmountChip>
            ))}
            <AmountChip selected={choice === 'custom'} onClick={() => setChoice('custom')} small>
              Other
            </AmountChip>
          </div>
          {choice === 'custom' && (
            <div className="mt-3 animate-rise">
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-2xl font-extrabold">£</span>
                <input
                  ref={customRef}
                  aria-label="Tip amount in pounds"
                  className={cx(inputClass, 'h-16 pl-10 text-2xl font-extrabold tabular-nums')}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={custom}
                  aria-invalid={customTouched && !!problem}
                  onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, ''))}
                  onBlur={() => setCustomTouched(true)}
                />
              </div>
              <p className={cx('mt-1.5 text-sm', customTouched && problem && custom ? 'font-medium text-bad' : 'text-mute')}>
                {customTouched && problem && custom ? problem : `Between ${formatGBP(MIN_TIP_PENCE)} and ${formatGBP(MAX_TIP_PENCE)}`}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-line bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-extrabold">Cover the fees</p>
              <p className="text-sm text-mute">{cover ? `${who} gets the full tip` : `Fees come out of ${who}'s tip`}</p>
            </div>
            <Switch label="Cover the fees" checked={cover} onChange={setCover} />
          </div>
          <FeeExample fb={fb} who={who} />
        </section>

        <section>
          <label htmlFor="note" className="mb-2 block font-extrabold">
            Add a note <span className="font-medium text-mute">(optional)</span>
          </label>
          <textarea
            id="note"
            rows={2}
            maxLength={140}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`Say thanks to ${who}…`}
            className={cx(inputClass, 'h-auto resize-none py-3')}
          />
          <p className="mt-1 text-right text-xs text-mute tabular-nums">{note.length}/140</p>
        </section>
      </div>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[440px] -translate-x-1/2 border-t border-line bg-paper/90 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),14px)] backdrop-blur-md">
        <Button size="lg" className="w-full" disabled={!fb} onClick={() => setPaying(true)}>
          {fb ? `Tip ${formatGBP(fb.charged)}` : 'Choose an amount'}
        </Button>
        <p className="mt-2 text-center text-xs text-mute">Demo: no money moves and no card details are taken.</p>
      </div>

      {fb && (
        <PaymentSheet open={paying} onClose={() => setPaying(false)} recipient={recipient} fb={fb} note={note} onPaid={onPaid} />
      )}
    </div>
  )
}

function AmountChip({ selected, onClick, children, small }: { selected: boolean; onClick: () => void; children: string; small?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cx(
        'h-16 rounded-2xl border-2 font-extrabold tracking-tight transition active:scale-95',
        small ? 'text-base' : 'text-2xl',
        selected ? 'border-ink bg-ink text-white' : 'border-line bg-card hover:border-ink/30',
      )}
    >
      {children}
    </button>
  )
}

function FeeExample({ fb, who }: { fb: FeeBreakdown | null; who: string }) {
  if (!fb) return <p className="mt-3 rounded-2xl bg-paper px-4 py-3 text-sm text-mute">Enter an amount to see the fees.</p>
  return (
    <div className="mt-3 rounded-2xl bg-paper px-4 py-3 text-sm">
      <Line label="Tip" value={formatGBP(fb.tip)} />
      <Line label={fb.coverFees ? 'Card fees, paid by you' : `Card fees, from ${who}'s tip`} value={formatGBP(fb.fee)} />
      <div className="my-2 border-t border-line" />
      <Line label="You pay" value={formatGBP(fb.charged)} strong />
      <Line label={`${who} gets`} value={formatGBP(fb.net)} strong highlight />
      <p className="mt-2 text-xs text-mute">
        Example card fee: {FEE_PERCENT}% + {FEE_FIXED_PENCE}p. A real payments provider sets the rate.
      </p>
    </div>
  )
}

function Line({ label, value, strong, highlight }: { label: string; value: string; strong?: boolean; highlight?: boolean }) {
  return (
    <div className={cx('flex justify-between py-0.5', strong ? 'font-extrabold' : 'text-ink/75')}>
      <span>{label}</span>
      <span className={cx('tabular-nums', highlight && 'rounded bg-lime px-1.5')}>{value}</span>
    </div>
  )
}

type Stage = 'idle' | 'wallet' | 'processing' | 'done'

function PaymentSheet({
  open,
  onClose,
  recipient,
  fb,
  note,
  onPaid,
}: {
  open: boolean
  onClose: () => void
  recipient: Recipient
  fb: FeeBreakdown
  note: string
  onPaid: (tip: Tip, last4?: string) => void
}) {
  const [outcome, setOutcome] = useState<'approve' | 'decline'>('approve')
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  const busy = stage !== 'idle'
  const card = DEMO_CARDS[outcome]

  async function pay(method: PaymentMethod) {
    setError(null)
    setStage(method === 'wallet' ? 'wallet' : 'processing')
    try {
      const payment = api.pay({
        handle: recipient.handle,
        amount: fb.tip,
        coverFees: fb.coverFees,
        note,
        method,
        outcome: method === 'wallet' ? 'approve' : outcome,
      })
      if (method === 'wallet') {
        await sleep(1000)
        setStage('processing')
      }
      const tip = await payment
      setStage('done')
      await sleep(1000)
      onPaid(tip, method === 'card' ? card.last4 : undefined)
    } catch (e) {
      setStage('idle')
      setError(e instanceof PaymentDeclinedError ? e.message : 'Something went wrong and nothing was charged. Try again.')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={busy ? undefined : `Pay ${firstName(recipient.name)}`} dismissible={!busy}>
      {busy ? (
        <Processing stage={stage} amount={fb.charged} />
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-card px-4 py-3 text-sm">
            <Line label="Tip" value={formatGBP(fb.tip)} />
            {fb.coverFees && <Line label="Card fees" value={formatGBP(fb.fee)} />}
            <Line label="Total" value={formatGBP(fb.charged)} strong />
          </div>

          {error && (
            <p role="alert" className="flex gap-2 rounded-2xl bg-bad/10 px-4 py-3 text-sm font-semibold text-bad">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <Button size="lg" className="w-full bg-black" icon={<Wallet className="size-5" />} onClick={() => void pay('wallet')}>
            Pay with wallet
          </Button>

          <div className="flex items-center gap-3 text-xs font-bold text-mute">
            <span className="h-px flex-1 bg-line" />
            OR PAY BY CARD
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="rounded-2xl border border-line bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Card details</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">Demo card</span>
            </div>
            {/* Deliberately not inputs: this demo has nowhere a real card number could be typed. */}
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-paper px-4 py-3 font-mono text-[15px] tracking-wider" aria-label={`Demo card number ${card.number}`}>
              <CreditCard className="size-5 shrink-0 text-mute" aria-hidden />
              {card.number}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[15px]">
              <div className="rounded-xl bg-paper px-4 py-3">12 / 34</div>
              <div className="rounded-xl bg-paper px-4 py-3">•••</div>
            </div>
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-bold text-mute">Demo outcome</p>
              <Segmented
                label="Demo outcome"
                value={outcome}
                onChange={(v) => {
                  setOutcome(v)
                  setError(null)
                }}
                options={[
                  { value: 'approve', label: 'Approved' },
                  { value: 'decline', label: 'Declined' },
                ]}
              />
            </div>
          </div>

          <Button variant="ghost" size="lg" className="w-full" icon={<Lock className="size-4" />} onClick={() => void pay('card')}>
            Pay {formatGBP(fb.charged)} by card
          </Button>
          <p className="text-center text-xs text-mute">Prefilled test card. Nothing is charged and nothing leaves this page.</p>
        </div>
      )}
    </Sheet>
  )
}

function Processing({ stage, amount }: { stage: Stage; amount: number }) {
  const done = stage === 'done'
  return (
    <div className="flex flex-col items-center py-10 text-center" aria-live="polite">
      <div className="relative grid size-24 place-items-center">
        {done ? (
          <span className="grid size-24 animate-pop place-items-center rounded-full bg-lime">
            <Check className="size-12" strokeWidth={3} aria-hidden />
          </span>
        ) : (
          <>
            <span className="absolute inset-0 rounded-full border-[6px] border-line" />
            <span className="absolute inset-0 animate-spin rounded-full border-[6px] border-transparent border-t-ink" />
            {stage === 'wallet' ? <Wallet className="size-8" aria-hidden /> : <Lock className="size-7" aria-hidden />}
          </>
        )}
      </div>
      <p className="mt-6 text-xl font-extrabold">
        {stage === 'wallet' ? 'Confirm in your wallet' : stage === 'processing' ? 'Processing…' : `Paid ${formatGBP(amount)}`}
      </p>
      <p className="mt-1 text-mute">{stage === 'wallet' ? 'Pretend you just double-clicked or looked at your phone' : done ? 'Done' : "Don't close this page"}</p>
    </div>
  )
}

function ThankYou({ recipient, tip, last4, onAgain }: { recipient: Recipient; tip: Tip; last4?: string; onAgain: () => void }) {
  const who = firstName(recipient.name)
  return (
    <div className="px-5 pt-6 pb-[max(env(safe-area-inset-bottom),28px)]">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <Avatar name={recipient.name} seed={recipient.handle} photo={recipient.photo} size={84} />
          <span className="absolute -right-1 -bottom-1 grid size-10 animate-pop place-items-center rounded-full border-4 border-paper bg-lime">
            <Check className="size-5" strokeWidth={3} aria-hidden />
          </span>
        </div>
        <h1 className="mt-5 animate-rise text-4xl font-extrabold tracking-tight">Thank you!</h1>
        <p className="mt-2 animate-rise text-lg text-mute [animation-delay:60ms]">
          {who} gets <span className="font-extrabold text-ink">{formatGBP(tip.net)}</span>.
        </p>
        {tip.note && (
          <p className="mt-4 max-w-xs animate-rise rounded-2xl rounded-bl-md bg-card px-4 py-3 text-left font-medium shadow-sm [animation-delay:120ms]">
            “{tip.note}”
          </p>
        )}
      </div>

      <section className="mt-8 animate-rise rounded-3xl border border-line bg-card p-5 [animation-delay:160ms]" aria-label="Receipt">
        <p className="text-xs font-extrabold tracking-[0.12em] text-mute uppercase">Receipt</p>
        <dl className="mt-3 space-y-2 text-[15px]">
          <ReceiptLine label="Paid to" value={`${recipient.name}${recipient.name.startsWith('@') ? '' : ` (@${recipient.handle})`}`} />
          <ReceiptLine label="Tip" value={formatGBP(tip.amount)} />
          <ReceiptLine label={tip.coverFees ? 'Card fees (you covered)' : `Card fees (from the tip)`} value={formatGBP(tip.fee)} />
          <ReceiptLine label="Total charged" value={formatGBP(tip.charged)} strong />
          <ReceiptLine label="Paid with" value={tip.method === 'wallet' ? 'Wallet' : `Demo card ••${last4 ?? '4242'}`} />
          <ReceiptLine label="Date" value={formatDateTime(tip.createdAt)} />
          <ReceiptLine label="Reference" value={tip.ref} mono />
        </dl>
        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-900">Demo receipt: no money moved</p>
      </section>

      <div className="mt-6 space-y-3">
        <Button variant="ghost" size="lg" className="w-full" onClick={onAgain}>
          Leave another tip
        </Button>
        <Link to="/" className="flex items-center justify-between rounded-3xl bg-ink p-5 text-white">
          <span>
            <span className="block font-extrabold">Get tipped like {who}</span>
            <span className="text-sm text-white/65">Make your own QR code in a minute</span>
          </span>
          <span className="grid size-10 place-items-center rounded-full bg-lime text-ink">
            <ArrowRight className="size-5" aria-hidden />
          </span>
        </Link>
      </div>
    </div>
  )
}

function ReceiptLine({ label, value, strong, mono }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-mute">{label}</dt>
      <dd className={cx('text-right', strong && 'font-extrabold', mono && 'font-mono text-sm', 'tabular-nums')}>{value}</dd>
    </div>
  )
}
