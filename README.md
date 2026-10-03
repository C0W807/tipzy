# Tipzy (demo)

A clickable prototype of cashless tipping for the UK. A service worker (waiter, barber,
driver) shows a personal QR code; a customer scans it and tips from a web page, with no
app and no account.

**This is a demo.** There is no backend, no real payment and no third-party account or
API key. Everything lives in the browser's `localStorage`, and every screen says so.

Live: **https://c0w807.github.io/tipzy/** (once published; see [Deploy](#deploy))

## The demo, in two minutes

1. On **your phone**, open the site and tap **Create my tip page**. Add a name, a role
   (tap a chip) and a venue; keep the suggested handle; tap **Fill example details** on
   the bank step, then **Verify account**. Leave "Fill my dashboard with demo tips" ticked.
2. On the dashboard, tap **Show my QR**. The screen goes high-contrast and stays awake.
3. The other person scans it with their **own phone's camera**. Their phone opens your tip
   page, read entirely from the link. They pick **£5**, leave a note and pay with the
   wallet button or the prefilled demo card.
4. Their phone has no way to reach yours (there's no server), so back on your phone tap
   **Choose the amount → £5 → Send test tip**. The tip drops in with a chime, and the
   totals count up.

To show a tip landing *for real*, use one device: open the dashboard in one tab and
**Open my tip page** (dashboard → Demo tools) in another. Pay there and the dashboard tab
updates over `BroadcastChannel`.

Other things to show: **My QR → Save PNG / Share / Print a card / Set up an NFC tag**,
**Payouts → Pay out now**, the **Declined** demo card on the payment sheet, and
**Settings → Clear all tips** for the empty states. **Settings → Reset demo** starts over.

## Run locally

Needs Node 22.12+ and pnpm (`corepack enable` gets you pnpm).

```sh
pnpm install
pnpm dev          # http://localhost:5173, plus a Network URL for your phone
pnpm test         # unit tests: fees, links, totals, payouts
pnpm build        # static site in dist/
pnpm e2e          # builds, then walks the whole demo in headless Chrome (screenshots in e2e/shots/)
```

## View it on a phone over your local network

`pnpm dev` listens on your network and prints a line like
`Network: http://192.168.1.23:5173/`. With the phone on the **same Wi-Fi**, open that
address on the phone.

- **Onboard on the phone itself**, using that Network address. The QR code points at
  whatever address the dashboard is open on, so a dashboard on `localhost` makes a QR
  that other phones can't open. If you onboard on the laptop, set
  **Settings → Address in your QR code** to the Network URL.
- Plain `http://` on a LAN isn't a "secure context", so the browser switches some things
  off: **wake lock** (the QR screen says "Turn off auto-lock to keep it on"), the
  **share sheet**, and the modern clipboard (copying falls back to an older method). The
  deployed `https://` site has all of them.
- If the phone can't connect, check the laptop's firewall allows incoming connections
  for Node.

## Deploy

It's a static site: `pnpm build` and serve `dist/`. Deep links like `/t/maya` need the
host to fall back to `index.html`; that's handled for each host below.

### GitHub Pages (the setup in this repo)

`.github/workflows/pages.yml` tests, builds and deploys on every push to `main`, with the
base path set to `/<repo-name>/`. `scripts/spa-fallback.mjs` copies `index.html` to
`404.html`, which is how GitHub Pages serves deep links.

First time only, with the [GitHub CLI](https://cli.github.com):

```sh
gh auth login -s workflow       # sign in as c0w807; the workflow scope lets it push the Actions file
pnpm run deploy:github          # creates c0w807/tipzy (public), pushes, turns on Pages, waits for the deploy
```

The script pushes with the CLI's login, not any other GitHub credentials git has saved.
For a different owner or repo name: `bash scripts/publish.sh <owner> <repo>`.

Doing it by hand instead: create a public repo, push `main`, then in the repo's
**Settings → Pages**, set **Source** to **GitHub Actions**.

### Netlify

New site from the repo: build command `pnpm build`, publish directory `dist`.
`public/_redirects` handles deep links. Or drag the `dist/` folder onto Netlify Drop.

### Vercel

Import the repo; Vercel detects Vite. `vercel.json` rewrites deep links to `index.html`.

## What's in here

```
src/
  lib/store.ts        the data layer: the only file that touches localStorage or BroadcastChannel
  lib/money.ts        pence, fees (example 1.5% + 20p), £ formatting, the £1–£50 limits
  lib/links.ts        handles, and the tip link: <site>/t/<handle>?n=<name>&r=<role>
  lib/stats.ts        today / this week (from Monday) / all time, weekly Monday payouts
  lib/demoData.ts     five weeks of believable seeded tips, matched to the role
  lib/images.ts       QR SVG, the 1080×1350 PNG, photo resizing
  pages/              Welcome, Onboarding, Home, Share, ShowQr, PrintCard, Nfc, Payouts,
                      Settings, TipPage (the public page), NotFound
e2e/walkthrough.mjs   end-to-end run of the whole demo
NEXT_STEPS.md         what a real version needs
```

`store.ts` exposes an async `api` with a little fake latency, so the loading states are
real. Replacing its function bodies with API calls is the path to a real backend; the
screens don't need to change. `NEXT_STEPS.md` maps each call to the service behind it.

## What's pretend

| In the demo | Really |
|---|---|
| "Connect your bank" accepts any well-formed details | Only "verified" and the account's last two digits are saved; the numbers are never stored |
| The payment sheet | There are no card fields at all. The demo card is prefilled text, with an Approved/Declined switch to show both outcomes |
| Fees | An example rate of 1.5% + 20p, to show the cover-the-fees maths |
| Payouts | Computed from the tips every Monday at 9am; "Pay out now" just moves the balance |
| Tips arriving | Same device: real, via BroadcastChannel. Across phones: the Simulate button |
| The tip page | Name and role come from the link (`n` and `r`), so it works on any phone. A photo only shows on the recipient's own device |
| Taken handles | A fixed list (`maya`, `sam`, `alex`, …) so the availability check can say no |
