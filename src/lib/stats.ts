import type { Payout, Tip } from './types'

const DAY_MS = 86_400_000

export function startOfDay(d: Date): Date {
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  return s
}

/** UK weeks start on Monday. */
export function startOfWeek(d: Date): Date {
  const s = startOfDay(d)
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7))
  return s
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const at = (iso: string) => Date.parse(iso)

export type Totals = {
  today: number
  todayCount: number
  week: number
  weekCount: number
  allTime: number
  allCount: number
}

/** Totals are what the recipient keeps (net of fees). */
export function summarise(tips: Tip[], now = new Date()): Totals {
  const day = startOfDay(now).getTime()
  const week = startOfWeek(now).getTime()
  const t: Totals = { today: 0, todayCount: 0, week: 0, weekCount: 0, allTime: 0, allCount: 0 }
  for (const tip of tips) {
    const ts = at(tip.createdAt)
    t.allTime += tip.net
    t.allCount++
    if (ts >= week) {
      t.week += tip.net
      t.weekCount++
    }
    if (ts >= day) {
      t.today += tip.net
      t.todayCount++
    }
  }
  return t
}

export function balance(tips: Tip[], payouts: Payout[]): number {
  return sum(tips.map((t) => t.net)) - sum(payouts.map((p) => p.amount))
}

/** Payouts land at 9am on Mondays. The next one strictly after `t`. */
export function nextPayoutDate(t: Date): Date {
  const d = startOfWeek(t)
  d.setHours(9, 0, 0, 0)
  if (d.getTime() <= t.getTime()) d.setDate(d.getDate() + 7)
  return d
}

/**
 * The weekly payouts that have come due since the last payout: each Monday pays
 * out everything earned before that Monday that hasn't been paid yet. Running it
 * on every read keeps a demo left open for days honest.
 */
export function settlePayouts(tips: Tip[], payouts: Payout[], handle: string, now: Date): Payout[] {
  if (!tips.length) return []
  const firstTip = Math.min(...tips.map((t) => at(t.createdAt)))
  const lastPayout = payouts.length ? Math.max(...payouts.map((p) => at(p.createdAt))) : -Infinity
  let paid = sum(payouts.map((p) => p.amount))
  const due: Payout[] = []
  for (let m = nextPayoutDate(new Date(firstTip)); m.getTime() <= now.getTime(); ) {
    if (m.getTime() > lastPayout) {
      const cutoff = startOfWeek(m).getTime()
      const owed = sum(tips.filter((t) => at(t.createdAt) < cutoff).map((t) => t.net)) - paid
      if (owed > 0) {
        due.push({ id: `po_${m.getTime().toString(36)}`, handle, amount: owed, kind: 'weekly', createdAt: m.toISOString() })
        paid += owed
      }
    }
    const next = new Date(m)
    next.setDate(next.getDate() + 7)
    m = next
  }
  return due
}

export type DayGroup = { key: string; label: string; total: number; tips: Tip[] }

const dayLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export function groupByDay(tips: Tip[], now = new Date()): DayGroup[] {
  const today = startOfDay(now).getTime()
  const groups = new Map<number, DayGroup>()
  for (const tip of tips) {
    const day = startOfDay(new Date(tip.createdAt)).getTime()
    let g = groups.get(day)
    if (!g) {
      const diff = Math.round((today - day) / DAY_MS)
      const label = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : dayLabel.format(new Date(day))
      g = { key: String(day), label, total: 0, tips: [] }
      groups.set(day, g)
    }
    g.total += tip.net
    g.tips.push(tip)
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([, g]) => g)
}
