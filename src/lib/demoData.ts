import { feeBreakdown } from './money'
import type { PaymentMethod, Tip, TipSource } from './types'

export type Rand = () => number

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Small seeded PRNG, so a handle's demo history is the same every time it is seeded on a given day. */
export function mulberry32(seed: number): Rand {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T,>(rand: Rand, xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]

type Kind = 'hospitality' | 'hair' | 'driver' | 'delivery'

export function roleKind(role: string): Kind {
  const r = role.toLowerCase()
  if (/barber|hair|stylist|salon|nail|beaut|lash|brow|groom/.test(r)) return 'hair'
  if (/driver|taxi|cab|chauffeur/.test(r)) return 'driver'
  if (/courier|deliver|rider/.test(r)) return 'delivery'
  return 'hospitality'
}

const NOTES: Record<Kind, readonly string[]> = {
  hospitality: [
    'Brilliant service, thank you!',
    'Thanks for looking after us tonight',
    'Lovely evening, cheers',
    'Great recommendations, thank you',
    'Thank you for being so patient with the kids',
    'Best flat white in town',
    'You made our anniversary',
    'Cheers! See you next week',
    'Thanks for squeezing us in',
  ],
  hair: [
    "Best fade I've had in ages",
    'Cheers, sharp as ever',
    'Thanks for fitting me in',
    'Love it, thank you!',
    'Great chat as always',
    'Exactly what I asked for',
  ],
  driver: [
    'Thanks for the safe ride home',
    'Cheers for waiting',
    'Lifesaver, thank you',
    'Thanks for helping with the bags',
    'Great chat, thanks',
    'Made my flight. Thank you!',
  ],
  delivery: [
    'Still hot, thank you!',
    'Thanks for braving the rain',
    'Super quick, cheers',
    'Thanks for bringing it up the stairs',
    'Brilliant, thank you',
  ],
}

/** Working hours per kind of job, for when seeded tips land. */
const HOURS: Record<Kind, [number, number]> = {
  hospitality: [11, 23],
  hair: [9, 19],
  driver: [7, 24],
  delivery: [11, 22],
}

/** Tip sizes and how often they come up; mostly the presets. */
const AMOUNTS: readonly [pence: number, weight: number][] = [
  [200, 22],
  [300, 24],
  [500, 24],
  [100, 4],
  [250, 4],
  [400, 5],
  [700, 3],
  [1000, 9],
  [1500, 2],
  [2000, 2],
]

function pickAmount(rand: Rand): number {
  const total = AMOUNTS.reduce((a, [, w]) => a + w, 0)
  let r = rand() * total
  for (const [pence, w] of AMOUNTS) {
    if ((r -= w) < 0) return pence
  }
  return 300
}

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makeRef(rand: Rand): string {
  let s = 'TZ-'
  for (let i = 0; i < 6; i++) s += pick(rand, REF_CHARS.split(''))
  return s
}

function makeId(rand: Rand): string {
  let s = 'tip_'
  for (let i = 0; i < 12; i++) s += Math.floor(rand() * 36).toString(36)
  return s
}

export function buildTip(
  rand: Rand,
  f: {
    handle: string
    amount: number
    coverFees: boolean
    note?: string
    method: PaymentMethod
    source: TipSource
    createdAt: Date
  },
): Tip {
  const fb = feeBreakdown(f.amount, f.coverFees)
  return {
    id: makeId(rand),
    ref: makeRef(rand),
    handle: f.handle,
    amount: fb.tip,
    fee: fb.fee,
    charged: fb.charged,
    net: fb.net,
    coverFees: fb.coverFees,
    ...(f.note ? { note: f.note } : {}),
    method: f.method,
    source: f.source,
    createdAt: f.createdAt.toISOString(),
  }
}

/** Five weeks of believable history, ending a few minutes before `now`. */
export function demoTips(handle: string, role: string, now: Date): Tip[] {
  const rand = mulberry32(hashString(`${handle}|${now.toDateString()}`))
  const kind = roleKind(role)
  const [open, close] = HOURS[kind]
  const tips: Tip[] = []

  for (let daysAgo = 34; daysAgo >= 0; daysAgo--) {
    const day = new Date(now)
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() - daysAgo)
    const dow = day.getDay()
    // Days off: more likely early in the week, never today.
    if (daysAgo > 0 && rand() < (dow === 1 || dow === 2 ? 0.55 : 0.18)) continue

    const busy = dow === 5 || dow === 6
    const count = daysAgo === 0 ? 2 + Math.floor(rand() * 3) : 2 + Math.floor(rand() * (busy ? 7 : 4))
    for (let i = 0; i < count; i++) {
      let when: Date
      if (daysAgo === 0) {
        // Today: spread over the few hours before now.
        const start = Math.max(now.getTime() - 6 * 3_600_000, day.getTime() + 60_000)
        const end = now.getTime() - 5 * 60_000
        if (end <= start) break
        when = new Date(start + rand() * (end - start))
      } else {
        when = new Date(day.getTime() + (open + rand() * (close - open)) * 3_600_000)
      }
      tips.push(
        buildTip(rand, {
          handle,
          amount: pickAmount(rand),
          coverFees: rand() < 0.62,
          note: rand() < 0.32 ? pick(rand, NOTES[kind]) : undefined,
          method: rand() < 0.66 ? 'wallet' : 'card',
          source: 'demo',
          createdAt: when,
        }),
      )
    }
  }
  return tips.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** One tip, arriving now: what the "Simulate incoming tip" button sends. */
export function randomTip(
  handle: string,
  role: string,
  now: Date,
  opts: { amount?: number; note?: string } = {},
): Tip {
  const rand = Math.random
  const note = opts.note?.trim() || (rand() < 0.55 ? pick(rand, NOTES[roleKind(role)]) : undefined)
  return buildTip(rand, {
    handle,
    amount: opts.amount ?? pickAmount(rand),
    coverFees: rand() < 0.6,
    note,
    method: rand() < 0.66 ? 'wallet' : 'card',
    source: 'simulated',
    createdAt: now,
  })
}
