import { describe, expect, it } from 'vitest'
import { demoTips } from './demoData'
import { balance, groupByDay, nextPayoutDate, settlePayouts, startOfWeek, summarise } from './stats'
import type { Tip } from './types'

const tip = (createdAt: Date, net: number): Tip => ({
  id: createdAt.toISOString(),
  ref: 'TZ-TEST00',
  handle: 'maya',
  amount: net,
  fee: 0,
  charged: net,
  net,
  coverFees: true,
  method: 'wallet',
  source: 'demo',
  createdAt: createdAt.toISOString(),
})

// Saturday 3 October 2026, 15:00 local.
const now = new Date(2026, 9, 3, 15, 0)

describe('summarise', () => {
  it('splits today, this week (from Monday) and all time', () => {
    const tips = [
      tip(new Date(2026, 9, 3, 11), 300), // today
      tip(new Date(2026, 8, 28, 20), 500), // Monday this week
      tip(new Date(2026, 8, 27, 20), 200), // Sunday last week
    ]
    expect(summarise(tips, now)).toMatchObject({ today: 300, todayCount: 1, week: 800, weekCount: 2, allTime: 1000, allCount: 3 })
  })
})

describe('payouts', () => {
  it('weeks start on Monday and payouts land Monday 9am', () => {
    expect(startOfWeek(now)).toEqual(new Date(2026, 8, 28))
    expect(nextPayoutDate(now)).toEqual(new Date(2026, 9, 5, 9))
    expect(nextPayoutDate(new Date(2026, 9, 5, 8))).toEqual(new Date(2026, 9, 5, 9))
  })

  it("pays each Monday for the week before, and leaves this week's tips as the balance", () => {
    const tips = [tip(new Date(2026, 8, 16, 12), 400), tip(new Date(2026, 8, 24, 12), 600), tip(new Date(2026, 9, 1, 12), 250)]
    const due = settlePayouts(tips, [], 'maya', now)
    expect(due.map((p) => [p.createdAt, p.amount])).toEqual([
      [new Date(2026, 8, 21, 9).toISOString(), 400],
      [new Date(2026, 8, 28, 9).toISOString(), 600],
    ])
    expect(balance(tips, due)).toBe(250)
    // Settling again changes nothing.
    expect(settlePayouts(tips, due, 'maya', now)).toEqual([])
  })
})

describe('demo data', () => {
  it('is believable: five weeks, all before now, presets most common', () => {
    const tips = demoTips('maya', 'Barista', now)
    expect(tips.length).toBeGreaterThan(40)
    expect(tips.every((t) => Date.parse(t.createdAt) < now.getTime())).toBe(true)
    expect(summarise(tips, now).todayCount).toBeGreaterThan(0)
    const groups = groupByDay(tips, now)
    expect(groups[0].label).toBe('Today')
  })
})
