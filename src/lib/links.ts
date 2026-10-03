import type { Profile } from './types'

export const HANDLE_MIN = 3
export const HANDLE_MAX = 20

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Tidies the handle field as it is typed: lowercase, hyphens for spaces, nothing else. */
export function cleanHandleInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[\s_.]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, HANDLE_MAX)
}

export function handleProblem(h: string): string | null {
  if (h.length < HANDLE_MIN) return `At least ${HANDLE_MIN} characters`
  if (h.length > HANDLE_MAX) return `No more than ${HANDLE_MAX} characters`
  if (!/^[a-z0-9-]+$/.test(h)) return 'Lowercase letters, numbers and hyphens only'
  if (h.startsWith('-') || h.endsWith('-')) return "Can't start or end with a hyphen"
  if (h.includes('--')) return 'No double hyphens'
  return null
}

export function suggestHandle(name: string): string {
  const slug = slugify(name).slice(0, HANDLE_MAX).replace(/-+$/, '')
  return slug.length >= HANDLE_MIN ? slug : ''
}

export function roleLine(role: string, venue: string): string {
  const r = role.trim()
  const v = venue.trim()
  if (r && v) return `${r} at ${v}`
  return r || v
}

export function withSlash(base: string): string {
  return base.endsWith('/') ? base : `${base}/`
}

/**
 * The link in the QR code. Name and role ride along in the query string, so the
 * tip page renders on any phone without a shared database.
 */
export function tipUrl(base: string, p: Pick<Profile, 'handle' | 'name' | 'role' | 'venue'>): string {
  const q = new URLSearchParams({ n: p.name.trim(), r: roleLine(p.role, p.venue) })
  return `${withSlash(base)}t/${encodeURIComponent(p.handle)}?${q.toString()}`
}

export function recipientFromLink(
  handle: string,
  search: string,
): { handle: string; name: string; role: string } | null {
  const h = handle.toLowerCase()
  if (handleProblem(h)) return null
  const q = new URLSearchParams(search)
  const name = (q.get('n') ?? '').trim().slice(0, 40)
  const role = (q.get('r') ?? '').trim().slice(0, 60)
  return { handle: h, name: name || `@${h}`, role }
}

/** example.com/t/maya, for showing a link without its query string. */
export function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\?.*$/, '')
}

export function firstName(name: string): string {
  if (name.startsWith('@')) return name
  return name.trim().split(/\s+/)[0] || name
}
