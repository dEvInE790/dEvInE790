import { useEffect, useRef } from 'react'
import { animate, useInView, useReducedMotion } from 'motion/react'

/** Counts up to `value` the first time it scrolls into view. */
export default function AnimatedNumber({ value = 0, format = (n) => Math.round(n).toLocaleString(), duration = 1.2, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -5% 0px' })
  const reduce = useReducedMotion()
  const from = useRef(0)
  const formatRef = useRef(format)
  formatRef.current = format

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const target = Number(value) || 0
    if (reduce || !inView) {
      if (reduce) el.textContent = formatRef.current(target)
      return
    }
    const controls = animate(from.current, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = formatRef.current(v)
      },
    })
    from.current = target
    return () => controls.stop()
  }, [value, inView, reduce, duration])

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {format(reduce ? Number(value) || 0 : 0)}
    </span>
  )
}
