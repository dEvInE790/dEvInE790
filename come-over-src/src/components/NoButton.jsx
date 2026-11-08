import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

const EDGE = 14 // keep this far from the screen edges
const rand = (min, max) => min + Math.random() * (max - min)

const inflate = (r, by) => ({ left: r.left - by, top: r.top - by, right: r.right + by, bottom: r.bottom + by })
const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by)

function viewport() {
  const vv = window.visualViewport
  return {
    w: vv ? vv.width : window.innerWidth,
    h: vv ? vv.height : window.innerHeight,
  }
}

/**
 * Pick a fresh spot on screen that: stays fully visible, never touches
 * anything in `avoid` (the YES button, the message, the music toggle),
 * is a decent hop from where the button is now, and far from the finger/cursor.
 */
function pickSpot({ w, h, current, pointer, avoid }) {
  const vp = viewport()
  // On wide screens keep it in a playful zone around the card instead of a far corner.
  const zoneHalf = Math.min(vp.w / 2, 460)
  const minX = Math.max(EDGE, vp.w / 2 - zoneHalf)
  const maxX = Math.min(vp.w - w - EDGE, vp.w / 2 + zoneHalf - w)
  const minY = EDGE + 52 // leave room for the music toggle row
  const maxY = vp.h - h - EDGE

  const cx = current.x + w / 2
  const cy = current.y + h / 2
  let best = null
  let bestScore = -Infinity

  for (let i = 0; i < 60; i++) {
    const x = rand(minX, Math.max(minX, maxX))
    const y = rand(minY, Math.max(minY, maxY))
    const rect = { left: x, top: y, right: x + w, bottom: y + h }
    if (avoid.some((r) => overlaps(rect, r))) continue

    const hop = dist(x + w / 2, y + h / 2, cx, cy)
    const fromPointer = pointer ? dist(x + w / 2, y + h / 2, pointer.x, pointer.y) : 300
    // Big enough hop to be visible, but not always the farthest corner — keeps it surprising.
    if (hop > 110 && fromPointer > 150 && hop < Math.max(vp.w, vp.h) * 0.75) return { x, y }

    const score = Math.min(fromPointer, 320) + Math.min(hop, 260) * 0.6
    if (score > bestScore) {
      bestScore = score
      best = { x, y }
    }
  }
  if (best) return best
  // Tiny screen and no random luck: scan a grid for any spot that is clear.
  for (let y = minY; y <= maxY; y += 24) {
    for (let x = minX; x <= maxX; x += 24) {
      const rect = { left: x, top: y, right: x + w, bottom: y + h }
      if (!avoid.some((r) => overlaps(rect, r))) return { x, y }
    }
  }
  return { x: minX, y: minY }
}

/**
 * The mischievous NO button.
 *  - dodges on hover (mouse), on touch, and on click/keyboard
 *  - sometimes shrinks a little, never below 72%
 *  - after `surrenderAfter` tries it gives up, walks home and works normally,
 *    so her real choice is always available.
 */
const NoButton = forwardRef(function NoButton({ avoidRefs, surrenderAfter, onAttempt, onSurrender, onRealNo }, ref) {
  const homeRef = useRef(null) // placeholder that keeps its spot in the layout
  const btnRef = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [pos, setPos] = useState(null) // null = sitting at home in the layout
  const [goingHome, setGoingHome] = useState(false)
  const [look, setLook] = useState({ scale: 1, rotate: 0 })
  const attempts = useRef(0)
  const lastDodge = useRef(0)
  const surrendered = useRef(false)
  const launchFrom = useRef(null) // where it was sitting when it first ran off
  const touchDodgeAt = useRef(0)

  useImperativeHandle(ref, () => ({
    reset() {
      attempts.current = 0
      surrendered.current = false
      setPos(null)
      setGoingHome(false)
      setLook({ scale: 1, rotate: 0 })
    },
  }))

  useLayoutEffect(() => {
    if (!btnRef.current || pos) return
    setSize({ w: btnRef.current.offsetWidth, h: btnRef.current.offsetHeight })
  }, [pos])

  const avoidRects = useCallback(
    () =>
      avoidRefs
        .map(({ ref: r, pad }) => (r.current ? inflate(r.current.getBoundingClientRect(), pad) : null))
        .filter(Boolean),
    [avoidRefs],
  )

  const dodge = useCallback(
    (pointer) => {
      if (surrendered.current || !btnRef.current) return
      const now = performance.now()
      if (now - lastDodge.current < 280) return // one hop per attempt, no jitter
      lastDodge.current = now

      attempts.current += 1
      const n = attempts.current

      if (n > surrenderAfter) {
        surrendered.current = true
        onSurrender?.()
        if (pos) setGoingHome(true)
        setLook({ scale: 0.92, rotate: 0 })
        return
      }

      const r = btnRef.current.getBoundingClientRect()
      const w = btnRef.current.offsetWidth
      const h = btnRef.current.offsetHeight
      const current = pos ?? { x: r.left, y: r.top }
      if (!pos) launchFrom.current = current
      setPos(pickSpot({ w, h, current, pointer, avoid: avoidRects() }))

      // Sometimes shrink a little; sometimes bounce back up. Always readable.
      setLook((prev) => {
        const shrink = Math.random() < 0.45
        const scale = shrink ? Math.max(0.72, prev.scale - 0.09) : Math.min(1, prev.scale + rand(0, 0.06))
        return { scale, rotate: rand(-9, 9) }
      })
      onAttempt?.(n)
    },
    [pos, avoidRects, onAttempt, onSurrender, surrenderAfter],
  )

  // Desktop: run away when the cursor gets close.
  useEffect(() => {
    const onMove = (e) => {
      if (e.pointerType !== 'mouse' || surrendered.current || !btnRef.current) return
      const r = btnRef.current.getBoundingClientRect()
      const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right)
      const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom)
      if (Math.hypot(dx, dy) < 28) dodge({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [dodge])

  // Keep it on screen if the phone rotates / the window resizes.
  useEffect(() => {
    if (!pos) return
    const onResize = () => {
      const vp = viewport()
      setPos((p) =>
        p && {
          x: Math.min(Math.max(EDGE, p.x), vp.w - size.w - EDGE),
          y: Math.min(Math.max(EDGE, p.y), vp.h - size.h - EDGE),
        },
      )
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [pos, size])

  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse' || surrendered.current) return
    touchDodgeAt.current = performance.now()
    dodge({ x: e.clientX, y: e.clientY }) // touch / pen: hop the moment a finger lands
  }
  const handleClick = (e) => {
    if (performance.now() - touchDodgeAt.current < 800) return // this tap already made it hop
    if (surrendered.current) {
      if (!goingHome) onRealNo()
      return
    }
    // keyboard Enter/Space, or a mouse that was quicker than the hover check
    const r = e.currentTarget.getBoundingClientRect()
    dodge(e.detail === 0 ? null : { x: e.clientX || r.left, y: e.clientY || r.top })
  }

  const label = (
    <>
      NO <span aria-hidden="true">🙈</span>
    </>
  )
  const className =
    'btn-soft select-none whitespace-nowrap focus:outline-none focus-visible:ring-4 focus-visible:ring-rose/40'

  // At home: a normal inline button.
  if (!pos) {
    return (
      <span ref={homeRef} className="inline-block">
        <motion.button
          ref={btnRef}
          type="button"
          className={className}
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          animate={look}
          whileTap={surrendered.current ? { scale: 0.92 } : undefined}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        >
          {label}
        </motion.button>
      </span>
    )
  }

  // On the run: an invisible placeholder holds its spot so nothing jumps,
  // and the real button floats above everything in a portal.
  const home = homeRef.current?.getBoundingClientRect()
  const target = goingHome && home ? { x: home.left, y: home.top } : pos

  return (
    <>
      <span ref={homeRef} className="inline-block" style={{ width: size.w, height: size.h }} />
      {createPortal(
        <motion.button
          ref={btnRef}
          type="button"
          className={`${className} fixed left-0 top-0 z-50`}
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          initial={launchFrom.current ? { ...launchFrom.current, scale: 1, rotate: 0 } : false}
          animate={{ x: target.x, y: target.y, scale: look.scale, rotate: look.rotate }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, mass: 0.8 }}
          onAnimationComplete={() => {
            if (goingHome) {
              setGoingHome(false)
              setPos(null)
            }
          }}
        >
          {label}
        </motion.button>,
        document.body,
      )}
    </>
  )
})

export default NoButton
