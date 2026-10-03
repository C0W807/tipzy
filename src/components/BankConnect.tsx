import { useState, type FormEvent } from 'react'
import { Check, Landmark, Lock } from 'lucide-react'
import { api } from '../lib/store'
import type { BankLink } from '../lib/types'
import { sleep } from '../lib/util'
import { Button, cx, Field, inputClass, Spinner } from './ui'

const STAGES = ['Checking the sort code', 'Matching the name on the account', 'Account verified']

function formatSortCode(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 6)
  return d.replace(/(\d{2})(?=\d)/g, '$1-')
}

/**
 * The fake "Connect your bank" step. Accepts any well-formed details, animates a
 * verification and hands back a BankLink: verified, plus the last two digits.
 * The details themselves are never stored.
 */
export function BankConnect({
  holderDefault,
  verified,
  onVerified,
  onChangeAccount,
}: {
  holderDefault: string
  verified: BankLink | null
  onVerified: (bank: BankLink) => void
  onChangeAccount?: () => void
}) {
  const [holder, setHolder] = useState(holderDefault)
  const [sortCode, setSortCode] = useState('')
  const [account, setAccount] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [stage, setStage] = useState(-1)
  const [error, setError] = useState<string | null>(null)

  const problems = {
    holder: holder.trim() ? null : 'Add the name on the account',
    sortCode: sortCode.replace(/\D/g, '').length === 6 ? null : 'Sort codes are 6 digits',
    account: account.replace(/\D/g, '').length === 8 ? null : 'Account numbers are 8 digits',
  }
  const valid = !problems.holder && !problems.sortCode && !problems.account
  const verifying = stage >= 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    setShowErrors(true)
    if (!valid || verifying) return
    setError(null)
    setStage(0)
    try {
      const result = api.verifyBank({ holder, sortCode, accountNumber: account })
      await sleep(650)
      setStage(1)
      await sleep(650)
      const bank = await result
      setStage(2)
      await sleep(700)
      setStage(-1)
      setSortCode('')
      setAccount('')
      onVerified(bank)
    } catch (err) {
      setStage(-1)
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    }
  }

  if (verified) {
    return (
      <div className="animate-rise rounded-3xl border border-good/25 bg-[#eaf6ef] p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-good text-white">
            <Landmark className="size-6" aria-hidden />
          </span>
          <div>
            <p className="text-lg font-extrabold">Account ending ••{verified.last2}</p>
            <p className="flex items-center gap-1 text-sm font-semibold text-good">
              <Check className="size-4" aria-hidden /> Verified
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-ink/70">Tips are paid here every Monday. Only "verified" and those two digits are saved, on this device.</p>
        {onChangeAccount && (
          <Button variant="ghost" size="sm" className="mt-3" onClick={onChangeAccount}>
            Use a different account
          </Button>
        )}
      </div>
    )
  }

  if (verifying) {
    return (
      <div className="rounded-3xl border border-line bg-card p-5" aria-live="polite">
        <p className="mb-4 font-extrabold">Verifying your account</p>
        <ol className="space-y-3">
          {STAGES.map((label, i) => (
            <li key={label} className={cx('flex items-center gap-3 transition-opacity', i > stage && 'opacity-35')}>
              <span
                className={cx(
                  'grid size-7 place-items-center rounded-full',
                  i < stage || stage === 2 ? 'bg-good text-white' : 'bg-paper-deep',
                )}
              >
                {i < stage || stage === 2 ? <Check className="size-4 animate-pop" /> : i === stage ? <Spinner className="size-4" /> : null}
              </span>
              <span className="font-semibold">{label}</span>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <span className="font-bold">Demo:</span> use made-up numbers. Any details work, and none of them are saved. A real version would
          check them with a regulated provider.{' '}
          <button
            type="button"
            className="font-bold underline underline-offset-2"
            onClick={() => {
              setSortCode('12-34-56')
              setAccount('12345678')
            }}
          >
            Fill example details
          </button>
        </p>
      </div>
      <Field label="Name on the account" htmlFor="holder" error={showErrors ? problems.holder : null}>
        <input
          id="holder"
          className={inputClass}
          value={holder}
          autoComplete="off"
          aria-invalid={showErrors && !!problems.holder}
          onChange={(e) => setHolder(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-[1fr_1.3fr] gap-3">
        <Field label="Sort code" htmlFor="sort" error={showErrors ? problems.sortCode : null}>
          <input
            id="sort"
            className={cx(inputClass, 'tabular-nums')}
            value={sortCode}
            inputMode="numeric"
            autoComplete="off"
            placeholder="12-34-56"
            aria-invalid={showErrors && !!problems.sortCode}
            onChange={(e) => setSortCode(formatSortCode(e.target.value))}
          />
        </Field>
        <Field label="Account number" htmlFor="acct" error={showErrors ? problems.account : null}>
          <input
            id="acct"
            className={cx(inputClass, 'tabular-nums')}
            value={account}
            inputMode="numeric"
            autoComplete="off"
            placeholder="12345678"
            aria-invalid={showErrors && !!problems.account}
            onChange={(e) => setAccount(e.target.value.replace(/\D/g, '').slice(0, 8))}
          />
        </Field>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-bad/10 px-4 py-3 text-sm font-semibold text-bad">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" icon={<Landmark className="size-5" />}>
        Verify account
      </Button>
    </form>
  )
}
