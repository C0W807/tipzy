import QRCode from 'qrcode'
import { avatarColours, initials } from './avatar'

const FONT = '"Plus Jakarta Sans Variable", system-ui, sans-serif'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image-load'))
    img.src = src
  })
}

/**
 * Crops a chosen photo to a centred square and shrinks it to a small JPEG data
 * URL, so it fits comfortably in localStorage.
 */
export async function squarePhoto(file: File, size = 320): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('not-image')
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const s = Math.min(img.naturalWidth, img.naturalHeight)
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('no-canvas')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size)
    return c.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  })
}

function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, start: number, maxWidth: number) {
  let size = start
  do {
    ctx.font = `${weight} ${size}px ${FONT}`
    size -= 2
  } while (ctx.measureText(text).width > maxWidth && size > 20)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** The downloadable QR: a 1080×1350 PNG (an Instagram-friendly 4:5) with name, role and the code. */
export async function qrPoster(o: { url: string; name: string; role: string; handle: string; photo?: string }): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`800 64px ${FONT}`),
    document.fonts.load(`600 32px ${FONT}`),
  ]).catch(() => undefined)

  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('no-canvas')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // Header band with the mark.
  ctx.fillStyle = '#0c0d10'
  ctx.fillRect(0, 0, W, 132)
  ctx.fillStyle = '#d4ff3a'
  roundRect(ctx, 60, 36, 60, 60, 17)
  ctx.fill()
  ctx.strokeStyle = '#0c0d10'
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(85, 50)
  ctx.lineTo(85, 73)
  ctx.quadraticCurveTo(85, 82, 94, 82)
  ctx.lineTo(99, 82)
  ctx.moveTo(77, 61)
  ctx.lineTo(98, 61)
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 44px ${FONT}`
  ctx.textBaseline = 'middle'
  ctx.fillText('tipzy', 138, 68)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#ffb020'
  ctx.font = `700 26px ${FONT}`
  ctx.fillText('DEMO – NO REAL PAYMENTS', W - 60, 68)
  ctx.textAlign = 'center'

  // Avatar.
  const ay = 250
  const ar = 74
  ctx.save()
  ctx.beginPath()
  ctx.arc(W / 2, ay, ar, 0, Math.PI * 2)
  ctx.clip()
  if (o.photo) {
    const img = await loadImage(o.photo)
    ctx.drawImage(img, W / 2 - ar, ay - ar, ar * 2, ar * 2)
  } else {
    const { bg, fg } = avatarColours(o.handle)
    ctx.fillStyle = bg
    ctx.fillRect(W / 2 - ar, ay - ar, ar * 2, ar * 2)
    ctx.fillStyle = fg
    ctx.font = `800 60px ${FONT}`
    ctx.fillText(initials(o.name), W / 2, ay + 3)
  }
  ctx.restore()

  ctx.fillStyle = '#0c0d10'
  fitText(ctx, o.name, 800, 64, W - 160)
  ctx.fillText(o.name, W / 2, 380)
  if (o.role) {
    ctx.fillStyle = '#6a6e77'
    fitText(ctx, o.role, 600, 34, W - 160)
    ctx.fillText(o.role, W / 2, 436)
  }

  // The code itself, on a quiet-zone frame.
  const qr = document.createElement('canvas')
  await QRCode.toCanvas(qr, o.url, { margin: 0, width: 600, errorCorrectionLevel: 'M' })
  ctx.strokeStyle = '#e6e4dc'
  ctx.lineWidth = 4
  roundRect(ctx, (W - 680) / 2, 486, 680, 680, 36)
  ctx.stroke()
  ctx.drawImage(qr, (W - 600) / 2, 526, 600, 600)

  ctx.fillStyle = '#0c0d10'
  ctx.font = `800 46px ${FONT}`
  ctx.fillText('Scan to leave a tip', W / 2, 1222)
  ctx.fillStyle = '#6a6e77'
  ctx.font = `600 28px ${FONT}`
  ctx.fillText('Use your phone camera · no app or account needed', W / 2, 1278)

  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'),
  )
}
