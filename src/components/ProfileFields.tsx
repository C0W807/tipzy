import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { squarePhoto } from '../lib/images'
import { Avatar } from './brand'
import { cx, Field, inputClass, Spinner } from './ui'

export type ProfileDraft = { name: string; role: string; venue: string; photo?: string }

const ROLES = ['Waiter', 'Bartender', 'Barista', 'Barber', 'Hairdresser', 'Driver', 'Courier']

export const profileDraftProblems = (d: ProfileDraft) => ({
  name: d.name.trim() ? null : 'Add the name customers know you by',
  role: d.role.trim() ? null : 'Add what you do',
})

export function ProfileFields({
  value,
  onChange,
  showErrors,
  seed,
}: {
  value: ProfileDraft
  onChange: (patch: Partial<ProfileDraft>) => void
  showErrors: boolean
  seed: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const problems = profileDraftProblems(value)

  async function pickPhoto(file: File | undefined) {
    if (!file) return
    setPhotoBusy(true)
    setPhotoError(null)
    try {
      onChange({ photo: await squarePhoto(file) })
    } catch {
      setPhotoError("That photo couldn't be read. Try a JPG or PNG.")
    } finally {
      setPhotoBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative rounded-full"
          aria-label={value.photo ? 'Change photo' : 'Add a photo'}
        >
          <Avatar name={value.name || '?'} seed={seed || value.name || 'tipzy'} photo={value.photo} size={84} />
          <span className="absolute -right-0.5 -bottom-0.5 grid size-8 place-items-center rounded-full border-2 border-paper bg-ink text-white">
            {photoBusy ? <Spinner className="size-4" /> : <Camera className="size-4" />}
          </span>
        </button>
        <div className="text-sm">
          <p className="font-bold">{value.photo ? 'Looking good' : 'Add a photo'}</p>
          <p className="text-mute">Customers see it on your tip page. Optional: your initials work too.</p>
          {value.photo && (
            <button type="button" onClick={() => onChange({ photo: undefined })} className="mt-1 font-bold text-ink underline underline-offset-2">
              Use initials instead
            </button>
          )}
          {photoError && <p className="mt-1 font-medium text-bad">{photoError}</p>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
      </div>

      <Field label="Your name" htmlFor="name" error={showErrors ? problems.name : null} hint="As customers know you, e.g. Maya or Maya Chen">
        <input
          id="name"
          className={inputClass}
          value={value.name}
          maxLength={40}
          autoComplete="name"
          aria-invalid={showErrors && !!problems.name}
          placeholder="Maya Chen"
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </Field>

      <Field label="What you do" htmlFor="role" error={showErrors ? problems.role : null}>
        <input
          id="role"
          className={inputClass}
          value={value.role}
          maxLength={30}
          aria-invalid={showErrors && !!problems.role}
          placeholder="Barista"
          onChange={(e) => onChange({ role: e.target.value })}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onChange({ role: r })}
              className={cx(
                'h-8 rounded-full border px-3 text-sm font-semibold transition',
                value.role === r ? 'border-ink bg-ink text-white' : 'border-line bg-card hover:border-ink/30',
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Where you work" htmlFor="venue" hint="Optional. A venue, salon or company">
        <input
          id="venue"
          className={inputClass}
          value={value.venue}
          maxLength={30}
          placeholder="Kin Coffee, Leith"
          onChange={(e) => onChange({ venue: e.target.value })}
        />
      </Field>
    </div>
  )
}
