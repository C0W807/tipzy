import { hashString } from './demoData'

/** Background and text colour for an initials avatar, fixed per handle so it never changes. */
const PAIRS: readonly [bg: string, fg: string][] = [
  ['#d4ff3a', '#0c0d10'],
  ['#0c0d10', '#d4ff3a'],
  ['#ffd9cc', '#5b2314'],
  ['#d3e4ff', '#0f2f63'],
  ['#e7dbff', '#3a1c71'],
  ['#ffeaa6', '#5a4300'],
  ['#c8f1e1', '#0b4a35'],
]

export function avatarColours(seed: string): { bg: string; fg: string } {
  const [bg, fg] = PAIRS[hashString(seed) % PAIRS.length]
  return { bg, fg }
}

export function initials(name: string): string {
  const words = name.replace(/^@/, '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  const first = words[0][0] ?? ''
  const last = words.length > 1 ? (words[words.length - 1][0] ?? '') : ''
  return (first + last).toUpperCase()
}
