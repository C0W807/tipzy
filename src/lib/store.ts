/**
 * Tipzy's data layer. This is the only module that reads or writes storage, and
 * the only one that knows tips can arrive from another tab.
 *
 * Every call is async, with a little made-up latency, so the screens already
 * handle the waits a real API brings. To put a backend behind the demo, replace
 * the bodies of `api` with fetch calls (and `subscribe` with a websocket or
 * push channel); nothing outside this file needs to change. NEXT_STEPS.md maps
 * each call to the real service it stands in for.
 */
import { buildTip, demoTips, randomTip } from './demoData'
import { handleProblem, recipientFromLink } from './links'
import { balance, nextPayoutDate, settlePayouts } from './stats'
import type { BankLink, PaymentMethod, Payout, Profile, Recipient, Settings, Tip } from './types'

const STORAGE_KEY = 'tipzy.demo.v1'
const CHANNEL_NAME = 'tipzy.demo'

type Db = { profile: Profile | null; tips: Tip[]; payouts: Payout[]; settings: Settings }

const DEFAULT_SETTINGS: Settings = { sound: true, qrBaseUrl: '' }
const emptyDb = (): Db => ({ profile: null, tips: [], payouts: [], settings: { ...DEFAULT_SETTINGS } })

function canPersist(): boolean {
  try {
    const k = '__tipzy_probe'
    window.localStorage.setItem(k, k)
    window.localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

/** False where storage is blocked (some private modes): the demo still runs, but forgets on close. */
export const isPersistent = typeof window !== 'undefined' && canPersist()
let memoryCopy: string | null = null

function readDb(): Db {
  let raw: string | null = null
  try {
    raw = isPersistent ? window.localStorage.getItem(STORAGE_KEY) : memoryCopy
  } catch {
    raw = null
  }
  if (!raw) return emptyDb()
  try {
    const parsed = JSON.parse(raw) as Partial<Db>
    return { ...emptyDb(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } }
  } catch {
    return emptyDb()
  }
}

function writeDb(db: Db) {
  const raw = JSON.stringify(db)
  if (!isPersistent) {
    memoryCopy = raw
    return
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, raw)
  } catch {
    throw new Error('This browser has run out of room for the demo. Try a smaller photo, or reset the demo in Settings.')
  }
}

/** Reads the database, paying out any Mondays that have come due since the last visit. */
function load(now = new Date()): Db {
  const db = readDb()
  const p = db.profile
  if (p?.bank) {
    const due = settlePayouts(
      db.tips.filter((t) => t.handle === p.handle),
      db.payouts.filter((x) => x.handle === p.handle),
      p.handle,
      now,
    )
    if (due.length) {
      db.payouts.push(...due)
      writeDb(db)
    }
  }
  return db
}

// ---- Change notifications -------------------------------------------------
// BroadcastChannel tells other tabs on this device; `listeners` tells this one
// (a channel never delivers to its own sender). Subscribers re-read on any change.

type Listener = () => void
const listeners = new Set<Listener>()
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL_NAME) : null
const notifyHere = () => listeners.forEach((l) => l())

channel?.addEventListener('message', notifyHere)
if (!channel && typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === null) notifyHere()
  })
}

function commit(db: Db) {
  writeDb(db)
  notifyHere()
  channel?.postMessage({ type: 'changed', at: Date.now() })
}

// ---- API ------------------------------------------------------------------

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const network = () => sleep(140 + Math.random() * 200)
const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt)

/** Handles that are "already taken", so the availability check has something to say no to. */
const TAKEN = new Set([
  'admin', 'tipzy', 'support', 'help', 'tips', 'api', 'www', 'home', 'settings',
  'share', 'payouts', 'maya', 'sam', 'alex', 'jo', 'chris',
])

function alternatives(h: string): string[] {
  const n = 10 + Math.floor(Math.random() * 89)
  return [`${h}-tips`, `${h}${n}`, `the-${h}`]
    .map((s) => s.slice(0, 20).replace(/-+$/, ''))
    .filter((s) => !TAKEN.has(s) && !handleProblem(s))
}

export class PaymentDeclinedError extends Error {}

export type PayInput = {
  handle: string
  amount: number
  coverFees: boolean
  note?: string
  method: PaymentMethod
  /** The demo card's outcome switch; a real provider decides this. */
  outcome: 'approve' | 'decline'
}

export type PayoutSummary = {
  payouts: Payout[]
  balance: number
  nextPayoutAt: string
  bank: BankLink | null
}

export const api = {
  /** Called on any change, in this tab or another on the same device. Returns an unsubscribe. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  async getProfile(): Promise<Profile | null> {
    await network()
    return load().profile
  },

  /** Saves an edited profile; a changed handle takes its tips and payouts with it. */
  async saveProfile(profile: Profile): Promise<Profile> {
    await network()
    const db = load()
    const old = db.profile?.handle
    if (old && old !== profile.handle) {
      db.tips.forEach((t) => {
        if (t.handle === old) t.handle = profile.handle
      })
      db.payouts.forEach((p) => {
        if (p.handle === old) p.handle = profile.handle
      })
    }
    db.profile = profile
    commit(db)
    return profile
  },

  /** Starts a fresh demo account, optionally with five weeks of seeded tips. */
  async completeOnboarding(profile: Profile, opts: { demoTips: boolean }): Promise<void> {
    await network()
    const db = emptyDb()
    db.settings = readDb().settings
    db.profile = profile
    if (opts.demoTips) db.tips = demoTips(profile.handle, profile.role, new Date())
    commit(db)
  },

  async checkHandle(handle: string): Promise<{ ok: true } | { ok: false; reason: string; suggestions: string[] }> {
    await sleep(350 + Math.random() * 250)
    const problem = handleProblem(handle)
    if (problem) return { ok: false, reason: problem, suggestions: [] }
    if (TAKEN.has(handle) && load().profile?.handle !== handle) {
      return { ok: false, reason: `@${handle} is already taken`, suggestions: alternatives(handle) }
    }
    return { ok: true }
  },

  /**
   * Pretends to verify a bank account. Accepts any well-formed details and keeps
   * none of them: the result is "verified" plus two digits to show on screen.
   */
  async verifyBank(details: { holder: string; sortCode: string; accountNumber: string }): Promise<BankLink> {
    await sleep(1900)
    const sort = details.sortCode.replace(/\D/g, '')
    const acct = details.accountNumber.replace(/\D/g, '')
    if (!details.holder.trim() || sort.length !== 6 || acct.length !== 8) {
      throw new Error('Those details look incomplete. Check them and try again.')
    }
    return { last2: acct.slice(-2), verifiedAt: new Date().toISOString() }
  },

  /** The public tip page's view of a recipient: whatever the link carries. */
  async getRecipient(handle: string, search: string): Promise<Recipient> {
    await sleep(300 + Math.random() * 300)
    const r = recipientFromLink(handle, search)
    if (!r) throw new Error('bad-link')
    // Same device as the recipient? Then we also know their photo.
    const own = load().profile
    if (own && own.handle === r.handle) {
      return { ...r, name: r.name.startsWith('@') ? own.name : r.name, photo: own.photo }
    }
    return r
  },

  async listTips(handle: string): Promise<Tip[]> {
    await network()
    return load()
      .tips.filter((t) => t.handle === handle)
      .sort(byNewest)
  },

  /** The fake payment. Records the tip on this device; another tab here sees it arrive. */
  async pay(input: PayInput): Promise<Tip> {
    await sleep(1400 + Math.random() * 500)
    if (input.outcome === 'decline') {
      throw new PaymentDeclinedError('Your card was declined. Nothing was charged.')
    }
    const tip = buildTip(Math.random, {
      handle: input.handle,
      amount: input.amount,
      coverFees: input.coverFees,
      note: input.note?.trim() || undefined,
      method: input.method,
      source: 'tip-page',
      createdAt: new Date(),
    })
    const db = load()
    db.tips.push(tip)
    commit(db)
    return tip
  },

  async simulateTip(handle: string, opts: { amount?: number; note?: string } = {}): Promise<Tip> {
    await sleep(650)
    const db = load()
    const tip = randomTip(handle, db.profile?.role ?? '', new Date(), opts)
    db.tips.push(tip)
    commit(db)
    return tip
  },

  async getPayouts(handle: string): Promise<PayoutSummary> {
    await network()
    const db = load()
    const tips = db.tips.filter((t) => t.handle === handle)
    const payouts = db.payouts.filter((p) => p.handle === handle).sort(byNewest)
    return {
      payouts,
      balance: balance(tips, payouts),
      nextPayoutAt: nextPayoutDate(new Date()).toISOString(),
      bank: db.profile?.bank ?? null,
    }
  },

  async instantPayout(handle: string): Promise<Payout> {
    await sleep(1600)
    const db = load()
    if (!db.profile?.bank) throw new Error('Connect a bank account first.')
    const owed = balance(
      db.tips.filter((t) => t.handle === handle),
      db.payouts.filter((p) => p.handle === handle),
    )
    if (owed <= 0) throw new Error('There is nothing to pay out yet.')
    const payout: Payout = {
      id: `po_${Date.now().toString(36)}`,
      handle,
      amount: owed,
      kind: 'instant',
      createdAt: new Date().toISOString(),
    }
    db.payouts.push(payout)
    commit(db)
    return payout
  },

  /** Replaces any seeded history with a fresh five weeks. Real and simulated tips stay. */
  async addDemoTips(): Promise<void> {
    await network()
    const db = load()
    const p = db.profile
    if (!p) return
    db.tips = db.tips.filter((t) => !(t.handle === p.handle && t.source === 'demo')).concat(demoTips(p.handle, p.role, new Date()))
    db.payouts = db.payouts.filter((x) => x.handle !== p.handle)
    commit(db)
  },

  /** Empties the feed and payouts, keeping the account: shows the empty states. */
  async clearTips(): Promise<void> {
    await network()
    const db = load()
    const h = db.profile?.handle
    db.tips = db.tips.filter((t) => t.handle !== h)
    db.payouts = db.payouts.filter((p) => p.handle !== h)
    commit(db)
  },

  async resetDemo(): Promise<void> {
    await network()
    if (isPersistent) window.localStorage.removeItem(STORAGE_KEY)
    else memoryCopy = null
    notifyHere()
    channel?.postMessage({ type: 'changed', at: Date.now() })
  },

  async getSettings(): Promise<Settings> {
    return load().settings
  },

  async saveSettings(patch: Partial<Settings>): Promise<Settings> {
    const db = load()
    db.settings = { ...db.settings, ...patch }
    commit(db)
    return db.settings
  },
}
