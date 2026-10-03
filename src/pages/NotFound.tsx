import { DemoBadge, Logo } from '../components/brand'
import { ButtonLink } from '../components/ui'

export default function NotFound() {
  return (
    <div className="min-h-dvh">
      <DemoBadge />
      <div className="flex min-h-[80dvh] flex-col items-center justify-center px-8 text-center">
        <Logo />
        <h1 className="mt-8 text-3xl font-extrabold tracking-tight">Nothing here</h1>
        <p className="mt-2 text-mute">This page doesn't exist. If someone gave you a tip link, check it was copied in full.</p>
        <ButtonLink to="/" className="mt-6">
          Go to Tipzy
        </ButtonLink>
      </div>
    </div>
  )
}
