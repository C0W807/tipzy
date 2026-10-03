# From demo to a real Tipzy

What a real version needs, roughly in the order it would be built. This isn't legal or
tax advice; the regulatory points are the questions to take to a payments lawyer and an
accountant before launch.

## 1. Payments provider

The demo's `api.pay()` stands in for a payment platform built for marketplaces, where
money goes from a customer to a person who isn't the platform:

- **Stripe Connect** (Express accounts) is the shortest path: hosted onboarding, identity
  checks, payouts, Apple Pay and Google Pay through the Payment Request button, and
  Radar for fraud. **Adyen for Platforms** and **Mangopay** are the alternatives.
- **Don't hold the money yourself.** Using the provider's connected-account model, where
  funds move from customer to worker through the provider, keeps Tipzy out of needing its
  own FCA authorisation as a payment institution. Confirm the structure with the provider
  and a lawyer.
- **Strong Customer Authentication** (3-D Secure) is the provider's job, but the page
  must handle the challenge step. Wallet payments usually skip it.
- **Real fees.** Replace the example 1.5% + 20p with the provider's actual pricing, plus
  any Tipzy fee. Cover-the-fees must be calculated server-side against the real fee and
  shown before payment.
- **Webhooks are the source of truth.** A tip exists when the provider says the payment
  succeeded, never because the browser says so.
- **Refunds and chargebacks.** Decide who carries a disputed tip (the worker or Tipzy),
  and say so in the terms.

## 2. Identity checks (KYC) and bank verification

Replaces the fake "Connect your bank" step (`api.verifyBank`):

- The provider's hosted onboarding collects name, date of birth, address and ID where
  needed, screens against sanctions lists, and decides when payouts may start. Recipients
  must be 18 or over.
- Bank details are verified by the provider, or through Confirmation of Payee or open
  banking (TrueLayer, Yapily). Tipzy should never store full account numbers.
- **Impersonation.** Anyone could claim to be "Maya at Kin Coffee". Consider venue
  verification, or at least a way to report a profile.

## 3. Accounts and authentication

- Passwordless sign-in suits workers on a phone: passkeys, plus email magic links or SMS
  codes. Supabase Auth, Clerk or Auth0 all do this.
- Customers stay accountless. An optional email for a receipt is the most to ask.

## 4. Database and API

Replaces `src/lib/store.ts`. Each `api` call becomes an endpoint:

| Demo call | Real version |
|---|---|
| `getProfile` / `saveProfile` / `completeOnboarding` | `GET/PUT /me`, after sign-in |
| `checkHandle` | `GET /handles/:handle`, a unique index plus a reserved-words list |
| `verifyBank` | The provider's onboarding link; a webhook marks the account ready |
| `getRecipient` | `GET /t/:handle`, the public profile, served from the database |
| `pay` | Create a payment intent server-side; confirm on the page; webhook records the tip |
| `listTips`, `getPayouts` | `GET /me/tips`, `GET /me/payouts`, paginated |
| `instantPayout` | The provider's instant payout API, where it's offered |
| `simulateTip` | Gone (or a staff-only test mode) |
| `subscribe` | Realtime channel (Supabase Realtime, Pusher, server-sent events) plus Web Push |

Postgres with tables for `profiles`, `handles`, `tips`, `payouts` and `payment_events`
(the raw webhook log). Row-level security so a worker sees only their own tips.

**The tip page must stop trusting the URL.** The demo reads the name and role from `?n=`
and `?r=` because there's no database. A real page looks the handle up server-side and
ignores anything else in the link; otherwise anyone can print a QR code that shows a
real person's name and takes payment for someone else. Existing printed codes still
work, because the handle is in the path.

## 5. Getting the tip to the worker's phone

- Realtime updates while the dashboard is open, and **Web Push** notifications when it
  isn't. On iPhone, Web Push needs the site added to the Home Screen; a native app shell
  is the alternative.
- Make the dashboard an installable PWA with an offline page.

## 6. Rules that apply to tips in the UK

- **Employment (Allocation of Tips) Act 2023**, in force since 1 October 2024: where an
  employer controls or influences tips, they must pass all of them on to workers, fairly,
  and follow the statutory code of practice. Tips paid straight to an individual through
  Tipzy fall outside the employer's hands, but any **venue or team mode** (pooled tips,
  a venue-wide QR) brings the Act into play.
- **Tax.** Tips are taxable income. Who reports them, and whether National Insurance
  applies, depends on how they're paid (directly, through payroll, or through a tronc).
  Provide clear annual statements, and get an accountant's view of what Tipzy has to
  report to HMRC.
- **Privacy.** UK GDPR: a privacy notice, a lawful basis for each piece of data, retention
  periods, and deleting accounts on request. No analytics cookies without consent.
- **Terms** for workers and customers, including refunds, disputes and fees.

## 7. Fraud and abuse

- A public payment page attracts **card testing**: rate-limit by IP and device, use the
  provider's fraud tools, and add a CAPTCHA (Cloudflare Turnstile) when attempts spike.
- Velocity and amount limits per recipient. Watch for workers tipping themselves to
  launder card payments.
- Notes are user-generated content: filter abuse, and let workers hide and report notes.
- Reserved handles (staff, brand names, offensive words), and a takedown process.

## 8. Product gaps worth closing

- Short links and a stable redirect when a handle changes, so printed cards keep working.
- Venue and team accounts: one QR for a venue, with tips split by rota or points (this is
  where the Allocation of Tips Act applies).
- Emailed receipts, tip history export, and an annual summary for tax.
- Accessibility audit (WCAG 2.2 AA), and testing with screen readers on both iOS and
  Android.
- Analytics on the funnel (scan → amount → pay → success), privacy-first.
- End-to-end tests against the provider's test mode in CI; the existing `pnpm e2e`
  walkthrough is the starting point.
