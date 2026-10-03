// Money is integer pence everywhere; pounds only exist on screen.

/** Example card processing rate shown on the tip page. Not a real quote. */
export const FEE_PERCENT = 1.5
export const FEE_FIXED_PENCE = 20

export const MIN_TIP_PENCE = 100
export const MAX_TIP_PENCE = 5000
export const PRESET_TIPS_PENCE = [200, 300, 500] as const

export type FeeBreakdown = {
  tip: number
  fee: number
  /** What the customer pays. */
  charged: number
  /** What the recipient keeps. */
  net: number
  coverFees: boolean
}

/**
 * With fees covered, the charge is grossed up so the fee taken on the whole
 * charge still leaves the full tip. Without, the fee comes out of the tip.
 */
export function feeBreakdown(tip: number, coverFees: boolean): FeeBreakdown {
  const rate = FEE_PERCENT / 100
  if (coverFees) {
    const charged = Math.ceil((tip + FEE_FIXED_PENCE) / (1 - rate))
    return { tip, fee: charged - tip, charged, net: tip, coverFees }
  }
  const fee = Math.round(tip * rate + FEE_FIXED_PENCE)
  return { tip, fee, charged: tip, net: tip - fee, coverFees }
}

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
const gbpWhole = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** £3.50; with `trim`, whole pounds drop the pence (£3). */
export function formatGBP(pence: number, opts: { trim?: boolean } = {}): string {
  if (opts.trim && pence % 100 === 0) return gbpWhole.format(pence / 100)
  return gbp.format(pence / 100)
}

/** "4", "4.5", "£4.50" → 450. Anything else → null. */
export function parsePounds(input: string): number | null {
  const s = input.replace(/[£,\s]/g, '')
  if (!/^\d{1,4}(\.\d{0,2})?$/.test(s)) return null
  return Math.round(parseFloat(s) * 100)
}

export function tipProblem(pence: number | null): string | null {
  if (pence === null) return 'Enter an amount, like 4 or 4.50'
  if (pence < MIN_TIP_PENCE) return `The smallest tip is ${formatGBP(MIN_TIP_PENCE)}`
  if (pence > MAX_TIP_PENCE) return `The largest tip is ${formatGBP(MAX_TIP_PENCE)}`
  return null
}
