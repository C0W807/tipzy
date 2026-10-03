import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { BankConnect } from '../components/BankConnect'
import { DemoBadge } from '../components/brand'
import { HandleField, type HandleStatus } from '../components/HandleField'
import { ProfileFields, profileDraftProblems, type ProfileDraft } from '../components/ProfileFields'
import { TipCard } from '../components/TipCard'
import { useToast } from '../components/toast'
import { Button, cx } from '../components/ui'
import { useProfile } from '../hooks/profile'
import { useTipLink } from '../hooks/useTipLink'
import { suggestHandle } from '../lib/links'
import { api } from '../lib/store'
import type { BankLink } from '../lib/types'

const STEPS = ['About you', 'Your link', 'Get paid'] as const

export default function Onboarding() {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile, loading, refresh } = useProfile()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<ProfileDraft>({ name: '', role: '', venue: '' })
  const [handle, setHandle] = useState('')
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle')
  const [bank, setBank] = useState<BankLink | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [withDemoTips, setWithDemoTips] = useState(true)
  const [finishing, setFinishing] = useState(false)
  const link = useTipLink({ handle: handle || 'your-handle', ...draft })

  if (!loading && profile && !finishing) return <Navigate to="/home" replace />

  const problems = profileDraftProblems(draft)

  function next() {
    if (step === 0) {
      setShowErrors(true)
      if (problems.name || problems.role) return
      if (!handle) setHandle(suggestHandle(draft.name))
    }
    setStep((s) => s + 1)
    window.scrollTo(0, 0)
  }

  function back() {
    if (step === 0) navigate('/')
    else setStep((s) => s - 1)
  }

  async function finish() {
    setFinishing(true)
    try {
      await api.completeOnboarding(
        { ...draft, name: draft.name.trim(), role: draft.role.trim(), venue: draft.venue.trim(), handle, bank, createdAt: new Date().toISOString() },
        { demoTips: withDemoTips },
      )
      await refresh()
      navigate('/home', { replace: true })
    } catch (e) {
      setFinishing(false)
      toast(e instanceof Error ? e.message : 'Could not save. Try again.', 'bad')
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBadge />
      <header className="flex items-center gap-3 px-3 pt-1">
        <button onClick={back} className="grid size-11 place-items-center rounded-full hover:bg-ink/5" aria-label="Back">
          <ArrowLeft className="size-6" />
        </button>
        {step < 3 && (
          <div className="flex flex-1 gap-1.5 pr-4" aria-label={`Step ${step + 1} of 3`}>
            {STEPS.map((s, i) => (
              <span key={s} className={cx('h-1.5 flex-1 rounded-full transition-colors', i <= step ? 'bg-ink' : 'bg-line')} />
            ))}
          </div>
        )}
      </header>

      <div key={step} className="flex flex-1 animate-rise flex-col px-6 pt-5 pb-[max(env(safe-area-inset-bottom),24px)]">
        {step < 3 && <p className="text-sm font-bold text-mute">Step {step + 1} of 3</p>}

        {step === 0 && (
          <>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Tell customers who you are</h1>
            <p className="mt-2 mb-6 text-mute">This is what they see when they scan your code.</p>
            <ProfileFields value={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} showErrors={showErrors} seed={handle || draft.name} />
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Pick your handle</h1>
            <p className="mt-2 mb-6 text-mute">It goes in your tip link and QR code. You can change it later.</p>
            <HandleField value={handle} onChange={setHandle} onStatus={setHandleStatus} />
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Connect your bank</h1>
            <p className="mt-2 mb-6 text-mute">Where your tips are paid each week.</p>
            <BankConnect holderDefault={draft.name} verified={bank} onVerified={setBank} onChangeAccount={() => setBank(null)} />
          </>
        )}

        {step === 3 && (
          <>
            <span className="grid size-14 animate-pop place-items-center rounded-full bg-lime">
              <Check className="size-7" strokeWidth={3} aria-hidden />
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight">You're ready for tips</h1>
            <p className="mt-2 mb-6 text-mute">Here's what customers will scan. It lives on your phone, and you can print it too.</p>
            <TipCard profile={{ ...draft, handle }} url={link} />
            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-card p-4">
              <input
                type="checkbox"
                checked={withDemoTips}
                onChange={(e) => setWithDemoTips(e.target.checked)}
                className="mt-0.5 size-5 accent-ink"
              />
              <span>
                <span className="block font-bold">Fill my dashboard with demo tips</span>
                <span className="text-sm text-mute">Five weeks of made-up history, so the dashboard looks lived in. Untick to start empty.</span>
              </span>
            </label>
          </>
        )}

        <div className="mt-auto pt-8">
          {step === 0 && (
            <Button size="lg" className="w-full" onClick={next}>
              Continue <ArrowRight className="size-5" />
            </Button>
          )}
          {step === 1 && (
            <Button size="lg" className="w-full" onClick={next} disabled={handleStatus !== 'ok'}>
              Continue <ArrowRight className="size-5" />
            </Button>
          )}
          {step === 2 && (
            <div className="space-y-2">
              {bank && (
                <Button size="lg" className="w-full" onClick={next}>
                  Continue <ArrowRight className="size-5" />
                </Button>
              )}
              {!bank && (
                <Button variant="quiet" size="md" className="w-full" onClick={next}>
                  Skip for now
                </Button>
              )}
            </div>
          )}
          {step === 3 && (
            <Button variant="lime" size="lg" className="w-full" onClick={() => void finish()} loading={finishing}>
              Open my dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
