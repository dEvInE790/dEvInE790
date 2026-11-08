import { HEART_PATH } from '../components/Heart.jsx'

// Tiny canvas confetti engine that throws hearts (and a few glitter dots).
// One shared full-screen canvas, created on first use.

const COLORS = ['#7a1f3d', '#b23a5e', '#e07a93', '#f2afc0', '#fff6ef', '#d9a86c', '#ff5c8a']
let canvas, ctx, heartPath, raf
let particles = []
let last = 0

function ensureCanvas() {
  if (canvas) return
  canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '60',
  })
  document.body.appendChild(canvas)
  ctx = canvas.getContext('2d')
  heartPath = new Path2D(HEART_PATH)
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  window.addEventListener('resize', resize)
}

function tick(now) {
  const dt = Math.min((now - last) / 16.67, 3) // 1 = one 60fps frame
  last = now
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  particles = particles.filter((p) => p.life > 0 && p.y < window.innerHeight + 60)
  for (const p of particles) {
    p.t += dt
    p.vx *= Math.pow(p.drag, dt)
    p.vy = p.vy * Math.pow(p.drag, dt) + p.gravity * dt
    p.x += (p.vx + Math.sin(p.t * p.wobble) * p.flutter) * dt
    p.y += p.vy * dt
    p.rot += p.vrot * dt
    p.life -= p.decay * dt

    ctx.save()
    ctx.globalAlpha = Math.min(1, p.life * 2.5)
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.fillStyle = p.color
    if (p.heart) {
      // fake 3D flip: squash horizontally over time
      ctx.scale((p.size / 24) * Math.cos(p.t * p.flip), p.size / 24)
      ctx.translate(-12, -12)
      ctx.fill(heartPath)
    } else {
      ctx.beginPath()
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  if (particles.length) raf = requestAnimationFrame(tick)
  else {
    raf = null
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}

/**
 * Throw a burst of hearts.
 * origin: {x, y} in 0..1 of the viewport; angle in degrees (90 = straight up).
 */
export function fireHearts({ origin = { x: 0.5, y: 0.6 }, count = 70, angle = 90, spread = 70, power = 14 } = {}) {
  if (typeof window === 'undefined') return
  ensureCanvas()
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const n = reduced ? Math.round(count / 3) : count

  for (let i = 0; i < n; i++) {
    const a = ((angle + (Math.random() - 0.5) * spread) * Math.PI) / 180
    const v = power * (0.55 + Math.random() * 0.6)
    const heart = Math.random() > 0.18
    particles.push({
      x: origin.x * window.innerWidth,
      y: origin.y * window.innerHeight,
      vx: Math.cos(a) * v,
      vy: -Math.sin(a) * v,
      size: heart ? 10 + Math.random() * 16 : 3 + Math.random() * 4,
      heart,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      rot: (Math.random() - 0.5) * 0.8,
      vrot: (Math.random() - 0.5) * 0.08,
      gravity: 0.22 + Math.random() * 0.08,
      drag: 0.965,
      wobble: 0.05 + Math.random() * 0.08,
      flutter: 0.6 + Math.random() * 1.2,
      flip: 0.04 + Math.random() * 0.06,
      t: Math.random() * 100,
      life: 1,
      decay: 0.005 + Math.random() * 0.004,
    })
  }
  if (!raf) {
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }
}

/** The big "she said yes" moment: two side cannons + a centre pop + a gentle rain. */
export function celebrate() {
  fireHearts({ origin: { x: 0.5, y: 0.55 }, count: 80, spread: 120, power: 16 })
  setTimeout(() => {
    fireHearts({ origin: { x: 0, y: 0.75 }, angle: 60, spread: 45, count: 55, power: 19 })
    fireHearts({ origin: { x: 1, y: 0.75 }, angle: 120, spread: 45, count: 55, power: 19 })
  }, 250)
  setTimeout(() => {
    for (let i = 0; i < 5; i++) {
      fireHearts({ origin: { x: 0.1 + i * 0.2, y: -0.05 }, angle: 270, spread: 60, count: 12, power: 3 })
    }
  }, 900)
}
