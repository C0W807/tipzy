// The "tip landed" sound: two soft sine notes, synthesised, so there is no audio file.
// Browsers only start audio after a tap, so the dashboard calls unlockAudio() on the
// first touch; after that, tips arriving from another tab can play too.

let ctx: AudioContext | null = null

function context(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function unlockAudio() {
  context()
}

export function playChime() {
  const ac = context()
  if (!ac) return
  const t = ac.currentTime + 0.02
  for (const [freq, delay] of [
    [1318.5, 0],
    [1760, 0.09],
  ] as const) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, t + delay)
    gain.gain.exponentialRampToValueAtTime(0.16, t + delay + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.55)
    osc.connect(gain).connect(ac.destination)
    osc.start(t + delay)
    osc.stop(t + delay + 0.6)
  }
}

export function buzz() {
  navigator.vibrate?.([24, 40, 60])
}
