import { describe, expect, it } from 'vitest'
import { feeBreakdown, formatGBP, parsePounds, tipProblem } from './money'

describe('feeBreakdown', () => {
  it('takes the fee out of the tip when fees are not covered', () => {
    expect(feeBreakdown(500, false)).toEqual({ tip: 500, fee: 28, charged: 500, net: 472, coverFees: false })
  })

  it('grosses up the charge so the recipient keeps the full tip when covered', () => {
    const fb = feeBreakdown(500, true)
    expect(fb.net).toBe(500)
    expect(fb.charged).toBe(528)
    // The fee on the whole charge still leaves at least the full tip.
    expect(fb.charged - (fb.charged * 0.015 + 20)).toBeGreaterThanOrEqual(500)
  })

  it.each([100, 200, 300, 500, 1234, 5000])('covered £%i keeps the whole tip', (p) => {
    const fb = feeBreakdown(p, true)
    expect(fb.charged - fb.fee).toBe(p)
    expect(fb.charged - Math.round(fb.charged * 0.015 + 20)).toBeGreaterThanOrEqual(p)
  })
})

describe('parsePounds', () => {
  it.each([
    ['4', 400],
    ['4.5', 450],
    ['4.50', 450],
    ['£12', 1200],
    ['4.', 400],
  ])('%s → %i', (input, pence) => expect(parsePounds(input)).toBe(pence))

  it.each(['', 'abc', '4.555', '-3', '.5'])('rejects %j', (input) => expect(parsePounds(input)).toBeNull())
})

describe('tipProblem', () => {
  it('enforces £1 to £50', () => {
    expect(tipProblem(99)).toMatch(/smallest/)
    expect(tipProblem(100)).toBeNull()
    expect(tipProblem(5000)).toBeNull()
    expect(tipProblem(5001)).toMatch(/largest/)
    expect(tipProblem(null)).toMatch(/Enter/)
  })
})

describe('formatGBP', () => {
  it('formats pence as pounds', () => {
    expect(formatGBP(472)).toBe('£4.72')
    expect(formatGBP(300, { trim: true })).toBe('£3')
    expect(formatGBP(350, { trim: true })).toBe('£3.50')
  })
})
