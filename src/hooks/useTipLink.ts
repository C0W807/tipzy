import { tipUrl, withSlash } from '../lib/links'
import { api } from '../lib/store'
import type { Profile, Settings } from '../lib/types'
import { useQuery } from './useQuery'

/** Where the app is being served from, e.g. https://c0w807.github.io/tipzy/ */
export function defaultSiteBase(): string {
  return window.location.origin + import.meta.env.BASE_URL
}

export function siteBase(settings: Settings | undefined): string {
  const override = settings?.qrBaseUrl.trim()
  return override ? withSlash(override) : defaultSiteBase()
}

/** The link a profile's QR code, card and NFC tag point at. Empty until settings load. */
export function useTipLink(profile: Pick<Profile, 'handle' | 'name' | 'role' | 'venue'> | null): string {
  const settings = useQuery(api.getSettings, [])
  if (!profile || settings.loading) return ''
  return tipUrl(siteBase(settings.data), profile)
}
