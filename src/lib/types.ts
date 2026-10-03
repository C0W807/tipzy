export type PaymentMethod = 'wallet' | 'card'

/** Where a tip came from: seeded history, a real run through the tip page, or the demo button. */
export type TipSource = 'demo' | 'tip-page' | 'simulated'

/** All amounts are integer pence. */
export type Tip = {
  id: string
  ref: string
  handle: string
  /** What the customer chose to tip. */
  amount: number
  fee: number
  /** What the customer paid. */
  charged: number
  /** What the recipient keeps. */
  net: number
  coverFees: boolean
  note?: string
  method: PaymentMethod
  source: TipSource
  createdAt: string
}

export type Payout = {
  id: string
  handle: string
  amount: number
  kind: 'weekly' | 'instant'
  createdAt: string
}

/** Everything the demo keeps of a bank account: that it was "verified", and two digits to show. */
export type BankLink = { last2: string; verifiedAt: string }

export type Profile = {
  handle: string
  name: string
  role: string
  venue: string
  /** A small square JPEG data URL, or nothing for initials. */
  photo?: string
  bank: BankLink | null
  createdAt: string
}

/** What the public tip page knows about who it is tipping: only what the link carries. */
export type Recipient = { handle: string; name: string; role: string; photo?: string }

export type Settings = {
  sound: boolean
  /** Overrides the address the QR code points at; empty means "wherever this is running". */
  qrBaseUrl: string
}
