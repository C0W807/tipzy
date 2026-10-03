import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronRight, Landmark, Link2, RotateCcw, Sparkles, Trash, Volume2 } from 'lucide-react'
import { BankConnect } from '../components/BankConnect'
import { Avatar } from '../components/brand'
import { HandleField, type HandleStatus } from '../components/HandleField'
import { ProfileFields, profileDraftProblems, type ProfileDraft } from '../components/ProfileFields'
import { useToast } from '../components/toast'
import { Button, Field, inputClass, PageHeader, Sheet, Switch } from '../components/ui'
import { useOwnProfile, useProfile } from '../hooks/profile'
import { useQuery } from '../hooks/useQuery'
import { defaultSiteBase } from '../hooks/useTipLink'
import { roleLine } from '../lib/links'
import { api, isPersistent } from '../lib/store'

type Confirm = 'clear' | 'reset' | null

export function Settings() {
  const profile = useOwnProfile()
  const { refresh } = useProfile()
  const settings = useQuery(api.getSettings, [])
  const navigate = useNavigate()
  const toast = useToast()
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [busy, setBusy] = useState(false)
  const [editingBase, setEditingBase] = useState(false)
  const [baseDraft, setBaseDraft] = useState('')
  const [baseError, setBaseError] = useState<string | null>(null)

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true)
    try {
      await action()
      toast(done)
    } catch {
      toast('Something went wrong. Try again.', 'bad')
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  async function resetDemo() {
    setBusy(true)
    await api.resetDemo()
    await refresh()
    navigate('/', { replace: true })
  }

  async function saveBase() {
    const v = baseDraft.trim()
    if (v) {
      try {
        const u = new URL(v)
        if (!/^https?:$/.test(u.protocol)) throw new Error()
      } catch {
        setBaseError('Enter a full address, starting http:// or https://')
        return
      }
    }
    await api.saveSettings({ qrBaseUrl: v })
    setEditingBase(false)
    toast(v ? 'QR link updated' : 'QR link reset')
  }

  const currentBase = settings.data?.qrBaseUrl || defaultSiteBase()

  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-6 px-4">
        <Group>
          <Row to="/settings/profile" icon={<Avatar name={profile.name} seed={profile.handle} photo={profile.photo} size={44} />}>
            <span className="block font-extrabold">{profile.name}</span>
            <span className="block text-sm text-mute">
              @{profile.handle} · {roleLine(profile.role, profile.venue)}
            </span>
          </Row>
          <Row to="/settings/bank" icon={<IconBox><Landmark className="size-5" /></IconBox>}>
            <span className="block font-bold">Bank account</span>
            <span className="block text-sm text-mute">{profile.bank ? `Ending ••${profile.bank.last2} · Verified` : 'Not connected'}</span>
          </Row>
        </Group>

        <div>
          <h2 className="mb-2 px-1 text-sm font-extrabold tracking-[0.1em] text-mute uppercase">Demo</h2>
          <Group>
            <li className="flex items-center gap-3 p-4">
              <IconBox>
                <Volume2 className="size-5" />
              </IconBox>
              <span className="flex-1">
                <span className="block font-bold">Sound when a tip lands</span>
                <span className="block text-sm text-mute">A short chime, plus a buzz on Android</span>
              </span>
              <Switch
                label="Sound when a tip lands"
                checked={settings.data?.sound ?? true}
                onChange={(sound) => void api.saveSettings({ sound })}
              />
            </li>
            <li className="p-4">
              <div className="flex items-center gap-3">
                <IconBox>
                  <Link2 className="size-5" />
                </IconBox>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">Address in your QR code</span>
                  <span className="block truncate text-sm text-mute">{currentBase}</span>
                </span>
                {!editingBase && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBaseDraft(settings.data?.qrBaseUrl ?? '')
                      setBaseError(null)
                      setEditingBase(true)
                    }}
                  >
                    Change
                  </Button>
                )}
              </div>
              {editingBase && (
                <div className="mt-3 space-y-2">
                  <Field
                    label="Site address"
                    htmlFor="base"
                    error={baseError}
                    hint="Running on a laptop? Put the address other phones can reach (your deployed site, or your laptop's network address). Leave empty to use this page's address."
                  >
                    <input
                      id="base"
                      className={inputClass}
                      value={baseDraft}
                      placeholder={defaultSiteBase()}
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      onChange={(e) => setBaseDraft(e.target.value)}
                    />
                  </Field>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void saveBase()}>
                      Save
                    </Button>
                    <Button size="sm" variant="quiet" onClick={() => setEditingBase(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </li>
            <ActionRow icon={<Sparkles className="size-5" />} title="Refill with demo tips" body="Five fresh weeks of made-up history" onClick={() => void run(api.addDemoTips, 'Demo tips added')} disabled={busy} />
            <ActionRow icon={<Trash className="size-5" />} title="Clear all tips" body="Keeps your account; shows the empty states" onClick={() => setConfirm('clear')} disabled={busy} />
            <ActionRow icon={<RotateCcw className="size-5 text-bad" />} title={<span className="text-bad">Reset demo</span>} body="Deletes everything and starts again" onClick={() => setConfirm('reset')} disabled={busy} />
          </Group>
        </div>

        <p className="px-1 pb-4 text-sm text-mute">
          Tipzy demo. Payments, bank checks and payouts are simulated, and everything stays in this browser.
          {!isPersistent && ' Storage is blocked here (private browsing?), so the demo forgets everything when the tab closes.'}
        </p>
      </div>

      <Sheet open={confirm === 'clear'} onClose={() => !busy && setConfirm(null)} title="Clear all tips?" dismissible={!busy}>
        <p className="text-mute">Your tips and payouts go; your profile, handle and bank stay. Use it to show the empty dashboard.</p>
        <Button size="lg" className="mt-5 w-full" loading={busy} onClick={() => void run(api.clearTips, 'Tips cleared')}>
          Clear tips
        </Button>
      </Sheet>
      <Sheet open={confirm === 'reset'} onClose={() => !busy && setConfirm(null)} title="Reset the demo?" dismissible={!busy}>
        <p className="text-mute">This deletes your profile, tips and settings from this browser and goes back to the start.</p>
        <Button variant="danger" size="lg" className="mt-5 w-full" loading={busy} onClick={() => void resetDemo()}>
          Reset everything
        </Button>
      </Sheet>
    </>
  )
}

export function EditProfile() {
  const profile = useOwnProfile()
  const { refresh } = useProfile()
  const navigate = useNavigate()
  const toast = useToast()
  const [draft, setDraft] = useState<ProfileDraft>({ name: profile.name, role: profile.role, venue: profile.venue, photo: profile.photo })
  const [handle, setHandle] = useState(profile.handle)
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle')
  const [saving, setSaving] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const problems = profileDraftProblems(draft)

  async function save() {
    setShowErrors(true)
    if (problems.name || problems.role || handleStatus !== 'ok') return
    setSaving(true)
    try {
      await api.saveProfile({ ...profile, ...draft, name: draft.name.trim(), role: draft.role.trim(), venue: draft.venue.trim(), handle })
      await refresh()
      toast('Profile saved')
      navigate('/settings')
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save. Try again.", 'bad')
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="Your profile" back="/settings" />
      <div className="space-y-6 px-5">
        <ProfileFields value={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} showErrors={showErrors} seed={handle} />
        <HandleField value={handle} onChange={setHandle} onStatus={setHandleStatus} />
        {handle !== profile.handle && (
          <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">
            A new handle means a new link: printed cards and NFC tags with the old one will stop matching.
          </p>
        )}
        <Button size="lg" className="w-full" loading={saving} disabled={handleStatus === 'checking'} onClick={() => void save()}>
          Save
        </Button>
      </div>
    </>
  )
}

export function BankSettings() {
  const profile = useOwnProfile()
  const { refresh } = useProfile()
  const toast = useToast()
  const [changing, setChanging] = useState(false)

  return (
    <>
      <PageHeader title="Bank account" back="/settings" />
      <div className="px-5">
        <p className="mb-5 text-mute">Your tips are paid here every Monday.</p>
        <BankConnect
          holderDefault={profile.name}
          verified={changing ? null : profile.bank}
          onChangeAccount={() => setChanging(true)}
          onVerified={async (bank) => {
            await api.saveProfile({ ...profile, bank })
            await refresh()
            setChanging(false)
            toast('Bank account connected')
          }}
        />
      </div>
    </>
  )
}

function Group({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">{children}</ul>
}

function IconBox({ children }: { children: ReactNode }) {
  return <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-paper-deep">{children}</span>
}

function Row({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 p-4 hover:bg-paper/60">
        {icon}
        <span className="min-w-0 flex-1">{children}</span>
        <ChevronRight className="size-5 text-mute" aria-hidden />
      </Link>
    </li>
  )
}

function ActionRow({
  icon,
  title,
  body,
  onClick,
  disabled,
}: {
  icon: ReactNode
  title: ReactNode
  body: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <li>
      <button onClick={onClick} disabled={disabled} className="flex w-full items-center gap-3 p-4 text-left hover:bg-paper/60 disabled:opacity-50">
        <IconBox>{icon}</IconBox>
        <span className="flex-1">
          <span className="block font-bold">{title}</span>
          <span className="block text-sm text-mute">{body}</span>
        </span>
      </button>
    </li>
  )
}
