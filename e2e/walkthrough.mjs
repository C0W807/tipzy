// Drives the built demo end to end, served the way GitHub Pages serves it (under
// /tipzy/, with 404.html for unknown paths), and saves a screenshot of every step.
//
//   pnpm e2e                      # builds, then runs against the installed Chrome
//   CHROME_PATH=/path/to/chrome pnpm e2e
//
// Screenshots, the downloaded PNG and the print PDFs land in e2e/shots/.
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { readFile, mkdir } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIST = join(HERE, '..', 'dist')
const OUT = join(HERE, 'shots')
const CHROME =
  process.env.CHROME_PATH ??
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/opt/pw-browsers/chromium'].find((p) => existsSync(p))
const BASE = '/tipzy/'
await mkdir(OUT, { recursive: true })

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' }
// GitHub Pages: real files, else 404.html with a 404 status.
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (!path.startsWith(BASE)) { res.writeHead(404); return res.end('not under base') }
  let rel = path.slice(BASE.length) || 'index.html'
  if (rel.endsWith('/')) rel += 'index.html'
  try {
    const body = await readFile(join(DIST, rel))
    res.writeHead(200, { 'content-type': TYPES[extname(rel)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/html' })
    res.end(await readFile(join(DIST, '404.html')))
  }
})
await new Promise((r) => server.listen(4173, '127.0.0.1', r))
const ORIGIN = 'http://127.0.0.1:4173'

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-GB', timezoneId: 'Europe/London' })
const errors = []
const watch = (p, name) => {
  p.on('console', (m) => m.type() === 'error' && !/404 \(Not Found\)/.test(m.text()) && errors.push(`${name}: ${m.text()}`))
  p.on('pageerror', (e) => errors.push(`${name} pageerror: ${e.message}`))
}
let n = 0
const shot = async (p, name, full = false) => p.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${name}.png`, fullPage: full })
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`)
  if (!cond) process.exitCode = 1
}
const settle = (p, ms = 400) => p.waitForTimeout(ms)

const page = await ctx.newPage()
watch(page, 'dash')

// 1. Welcome
await page.goto(ORIGIN + BASE)
await page.getByText('Tips,').waitFor()
await settle(page, 600)
await shot(page, 'welcome')
ok(await page.getByText('Demo – no real payments').first().isVisible(), 'demo badge on welcome')
await shot(page, 'welcome-full', true)

// 2. Onboarding: about you (try Continue empty first to see errors)
await page.getByRole('link', { name: /Create my tip page/ }).click()
await page.getByRole('button', { name: /Continue/ }).click()
ok(await page.getByText('Add the name customers know you by').isVisible(), 'onboarding shows validation errors')
await shot(page, 'onboarding-errors')
await page.locator('#name').fill('Jamie Rennie')
await page.getByRole('button', { name: 'Barber', exact: true }).click()
await page.locator('#venue').fill('Fade Room')
await shot(page, 'onboarding-about')
await page.getByRole('button', { name: /Continue/ }).click()

// 3. Handle: suggestion, taken, then ok
ok((await page.locator('#handle').inputValue()) === 'jamie-rennie', 'handle suggested from name')
await page.getByText('@jamie-rennie is yours').waitFor()
await page.locator('#handle').fill('maya')
await page.getByText('@maya is already taken').waitFor()
await shot(page, 'handle-taken')
await page.locator('#handle').fill('jamie')
await page.getByText('@jamie is yours').waitFor()
await shot(page, 'handle-ok')
await page.getByRole('button', { name: /Continue/ }).click()

// 4. Bank
await page.getByRole('button', { name: 'Verify account' }).click()
ok(await page.getByText('Sort codes are 6 digits').isVisible(), 'bank form validates')
await page.getByRole('button', { name: 'Fill example details' }).click()
await shot(page, 'bank-form')
await page.getByRole('button', { name: 'Verify account' }).click()
await page.getByText('Matching the name on the account').waitFor()
await settle(page, 500)
await shot(page, 'bank-verifying')
await page.getByText('Account ending ••78').waitFor({ timeout: 8000 })
await shot(page, 'bank-verified')
const stored = await page.evaluate(() => localStorage.getItem('tipzy.demo.v1') ?? '')
ok(!stored.includes('12345678') && !stored.includes('123456'), 'bank numbers never stored')
await page.getByRole('button', { name: /Continue/ }).click()

// 5. Done
await page.getByText("You're ready for tips").waitFor()
await settle(page, 600)
await shot(page, 'onboarding-done', true)
await page.getByRole('button', { name: 'Open my dashboard' }).click()

// 6. Dashboard
await page.waitForURL(/\/tipzy\/home$/)
await page.getByText('Recent tips').waitFor()
await page.getByText('Today', { exact: true }).first().waitFor()
await settle(page, 1200)
await shot(page, 'dashboard')
await shot(page, 'dashboard-full', true)
const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('tipzy.demo.v1')))
ok(saved.profile.bank && Object.keys(saved.profile.bank).sort().join() === 'last2,verifiedAt', 'bank stored as last2 + verifiedAt only')
ok(saved.tips.length > 40, `seeded ${saved.tips.length} demo tips`)

// Simulate
await page.getByRole('button', { name: /Simulate incoming tip/ }).click()
await page.getByText('New tip', { exact: true }).waitFor({ timeout: 5000 })
await settle(page, 500)
await shot(page, 'simulated-arrival')
await page.waitForTimeout(3600)

// 7. Share hub: read the link, decode the QR
await page.getByRole('link', { name: 'My QR', exact: true }).click()
await page.getByText('Your link').waitFor()
await settle(page, 500)
const link = (await page.locator('p.select-all').textContent()).trim()
ok(link === `${ORIGIN}/tipzy/t/jamie?n=Jamie+Rennie&r=Barber+at+Fade+Room`, `tip link is ${link}`)
await shot(page, 'share', true)
const qrPng = PNG.sync.read(await page.locator('[role=img][aria-label^="QR code"]').first().screenshot())
const decoded = jsQR(new Uint8ClampedArray(qrPng.data), qrPng.width, qrPng.height)
ok(decoded?.data === link, `QR decodes to the tip link (${decoded?.data})`)

// PNG download
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save PNG' }).click()])
await download.saveAs(`${OUT}/download-${download.suggestedFilename()}`)
ok(download.suggestedFilename() === 'tipzy-jamie.png', 'PNG download named tipzy-jamie.png')
const poster = PNG.sync.read(await readFile(`${OUT}/download-tipzy-jamie.png`))
const posterQr = jsQR(new Uint8ClampedArray(poster.data), poster.width, poster.height)
ok(poster.width === 1080 && poster.height === 1350 && posterQr?.data === link, 'downloaded PNG is 1080×1350 and scans to the link')

// Full-screen QR
await page.getByRole('link', { name: /Show full screen/ }).click()
await page.getByText('Scan to leave a tip').waitFor()
await settle(page, 500)
await shot(page, 'fullscreen-qr')
ok(await page.getByText(/Screen stays on|Keeping screen on|auto-lock/).isVisible(), 'wake lock status shown')
await page.getByRole('button', { name: 'Close' }).click()

// Print card (both layouts) and NFC
await page.getByRole('link', { name: /Print a card/ }).click()
await page.getByText('Printable card').waitFor()
await settle(page, 500)
await shot(page, 'print-counter', true)
await page.getByRole('radio', { name: '8 cards on A4' }).click()
await settle(page, 500)
await shot(page, 'print-business', true)
await page.emulateMedia({ media: 'print' })
await page.pdf({ path: `${OUT}/print-business.pdf`, printBackground: true, preferCSSPageSize: true })
await page.emulateMedia({ media: 'screen' })
await page.getByRole('radio', { name: 'Counter card (A6)' }).click()
await settle(page, 300)
await page.emulateMedia({ media: 'print' })
await page.pdf({ path: `${OUT}/print-counter.pdf`, printBackground: true, preferCSSPageSize: true })
await page.emulateMedia({ media: 'screen' })
await page.goto(ORIGIN + BASE + 'share/nfc')
await page.getByText('Let customers tap instead').waitFor()
await shot(page, 'nfc', true)

// 8. Customer: tip page in a second tab on the same device
await page.goto(ORIGIN + BASE + 'home')
await page.getByText('Recent tips').waitFor()
await settle(page, 800)
const cust = await ctx.newPage()
watch(cust, 'tip')
await cust.goto(link)
await settle(cust, 100)
await shot(cust, 'tip-loading')
await cust.getByText('Choose a tip').waitFor()
await settle(cust, 400)
await shot(cust, 'tip-page')
await cust.getByRole('radio', { name: 'Other' }).click()
await cust.getByLabel('Tip amount in pounds').fill('60')
await cust.getByLabel('Tip amount in pounds').blur()
ok(await cust.getByText('The largest tip is £50.00').isVisible(), 'custom amount over £50 rejected')
await shot(cust, 'tip-custom-error')
await cust.getByRole('radio', { name: '£5' }).click()
ok(await cust.getByRole('button', { name: 'Tip £5.28' }).isVisible(), 'covered £5 tip charges £5.28')
await cust.getByRole('switch', { name: 'Cover the fees' }).click()
ok(await cust.getByText('£4.72').isVisible(), 'uncovered £5 tip leaves £4.72')
await shot(cust, 'tip-fees-off')
await cust.getByRole('switch', { name: 'Cover the fees' }).click()
await cust.locator('#note').fill('Sharpest fade in Leith, cheers Jamie')
await shot(cust, 'tip-filled', true)
await cust.getByRole('button', { name: 'Tip £5.28' }).click()
await cust.getByText('Pay with wallet').waitFor()
await settle(cust, 500)
await shot(cust, 'pay-sheet')
await cust.getByRole('radio', { name: 'Declined' }).click()
await cust.getByRole('button', { name: /by card/ }).click()
await cust.getByText('Processing…').waitFor()
await shot(cust, 'pay-processing')
await cust.getByText('Your card was declined').waitFor({ timeout: 6000 })
await shot(cust, 'pay-declined')
await cust.getByRole('radio', { name: 'Approved' }).click()
await cust.getByRole('button', { name: /by card/ }).click()
await cust.getByText('Thank you!').waitFor({ timeout: 8000 })
await settle(cust, 700)
await shot(cust, 'thank-you', true)
ok(await cust.getByText('Demo card ••4242').isVisible(), 'receipt shows demo card')

// Back on the dashboard tab: the tip arrived over BroadcastChannel
await page.bringToFront()
const arrived = await page.locator('button', { hasText: 'New tip' }).filter({ hasText: '+£5.00' }).waitFor({ timeout: 6000 }).then(() => true, () => false)
ok(arrived, 'tip from the other tab arrives on the dashboard')
await settle(page, 400)
await shot(page, 'cross-tab-arrival')
await page.waitForTimeout(3800)
ok(await page.getByText('“Sharpest fade in Leith, cheers Jamie”').first().isVisible(), 'note shows in the feed')

// Simulate with a chosen amount
await page.getByRole('button', { name: 'Choose the amount' }).click()
await settle(page, 400)
await shot(page, 'simulate-picker')
await page.getByRole('button', { name: '£20', exact: true }).click()
await page.getByRole('button', { name: 'Send test tip' }).click()
await page.locator('button', { hasText: 'New tip' }).filter({ hasText: '+£' }).waitFor({ timeout: 5000 })
await page.waitForTimeout(3800)

// 9. Payouts: instant payout
await page.getByRole('link', { name: 'Payouts', exact: true }).click()
await page.getByText('Balance', { exact: true }).waitFor()
await settle(page, 500)
await shot(page, 'payouts', true)
await page.getByRole('button', { name: 'Pay out now' }).click()
await page.getByRole('button', { name: /^Pay out £/ }).click()
await page.getByText(/paid out$/).waitFor({ timeout: 6000 })
await settle(page, 300)
await shot(page, 'payouts-after')
ok(await page.getByText('Instant payout').first().isVisible(), 'instant payout in history')

// 10. Settings: clear tips → empty states, then reset
await page.getByRole('link', { name: 'Settings', exact: true }).click()
await page.getByText('Reset demo').waitFor()
await shot(page, 'settings', true)
await page.getByRole('button', { name: /Clear all tips/ }).click()
await page.getByRole('button', { name: 'Clear tips' }).click()
await page.getByText('Tips cleared').waitFor()
await page.getByRole('link', { name: 'Home', exact: true }).click()
await page.getByText('No tips yet').waitFor()
await settle(page, 600)
await shot(page, 'dashboard-empty')
await page.getByRole('link', { name: 'Payouts', exact: true }).click()
await page.getByText('No payouts yet').waitFor()
await shot(page, 'payouts-empty')

// 11. Error states and a cold deep link on a "second phone"
const phone2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-GB' })
const p2 = await phone2.newPage()
watch(p2, 'phone2')
const resp = await p2.goto(link)
ok(resp.status() === 404, 'deep link served via 404.html (as on GitHub Pages)')
await p2.getByText('Jamie Rennie').waitFor()
ok(await p2.getByText('Barber at Fade Room').isVisible(), 'second phone reads name and role from the URL')
await p2.goto(ORIGIN + BASE + 't/a')
await p2.getByText("This tip link isn't working").waitFor()
await shot(p2, 'bad-link')
await p2.goto(ORIGIN + BASE + 'nope/nothing')
await p2.getByText('Nothing here').waitFor()
await shot(p2, 'not-found')
await p2.goto(ORIGIN + BASE + 'home')
await p2.waitForURL(/\/tipzy\/?$/)
ok(true, 'dashboard without a profile redirects to welcome')

// Reset demo
await page.getByRole('link', { name: 'Settings', exact: true }).click()
await page.getByRole('button', { name: /Reset demo/ }).click()
await page.getByRole('button', { name: 'Reset everything' }).click()
await page.getByText('Tips,').waitFor()
ok((await page.evaluate(() => localStorage.getItem('tipzy.demo.v1'))) === null, 'reset demo clears storage and returns to welcome')

console.log(errors.length ? `\nConsole errors:\n${errors.join('\n')}` : '\nNo console errors')
if (errors.length) process.exitCode = 1
await browser.close()
server.close()
