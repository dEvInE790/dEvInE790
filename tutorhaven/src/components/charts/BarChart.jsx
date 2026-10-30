import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { ease } from '../../motion/variants'

function niceMax(v) {
  if (v <= 0) return 4
  const pow = 10 ** Math.floor(Math.log10(v))
  const n = v / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return step * pow
}

// Rounded top corners only; the bar stays anchored to the baseline.
function barPath(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h)
  if (h <= 0) return ''
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`
}

/**
 * Single-series column chart. data: [{ label, value, detail? }].
 * Bars grow from the baseline on first view; hover/focus shows a tooltip;
 * a visually hidden table carries the same data for screen readers.
 */
export default function BarChart({ data, format = (v) => v, height = 220, title }) {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState(null)
  const inView = useInView(wrapRef, { once: true, margin: '0px 0px -10% 0px' })

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pad = { top: 12, right: 4, bottom: 28, left: 44 }
  const max = useMemo(() => niceMax(Math.max(0, ...data.map((d) => d.value))), [data])
  const ticks = [0, max / 2, max]
  const innerW = Math.max(0, width - pad.left - pad.right)
  const innerH = height - pad.top - pad.bottom
  const band = data.length ? innerW / data.length : 0
  const barW = Math.max(6, Math.min(36, band * 0.56))
  const y = (v) => pad.top + innerH - (v / max) * innerH
  // Thin out x labels when bands get too narrow to fit them; tooltips keep the detail.
  const labelEvery = band < 46 ? 2 : 1
  const showLabel = (i) => (data.length - 1 - i) % labelEvery === 0

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={title} className="overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="#0f1c36" strokeOpacity={t === 0 ? 0.14 : 0.06} strokeDasharray={t === 0 ? undefined : '3 4'} />
              <text x={pad.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-navy-400 text-[11px] tabular-nums">
                {format(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = pad.left + band * i + band / 2
            const h = (d.value / max) * innerH
            const active = hover === i
            return (
              <g key={d.label + i}>
                <motion.path
                  d={barPath(cx - barW / 2, pad.top + innerH - h, barW, h, 4)}
                  fill={active ? '#182746' : '#1a8d64'}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: inView ? 1 : 0 }}
                  transition={{ duration: 0.7, ease, delay: inView ? 0.05 * i : 0 }}
                  style={{ transformOrigin: `${cx}px ${pad.top + innerH}px`, transition: 'fill 160ms' }}
                />
                {(showLabel(i) || active) && (
                  <text x={cx} y={height - 8} textAnchor="middle" className={`text-[11px] ${active ? 'fill-navy-900 font-semibold' : 'fill-navy-400'}`}>
                    {d.label}
                  </text>
                )}
                {/* Hit target larger than the mark */}
                <rect
                  x={pad.left + band * i}
                  y={pad.top}
                  width={band}
                  height={innerH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${d.label}: ${format(d.value)}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="outline-none"
                />
              </g>
            )
          })}
        </svg>
      )}
      <AnimatePresence>
        {hover != null && data[hover] && (
          <motion.div
            key="tip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-navy-950 px-3 py-2 text-xs whitespace-nowrap text-white shadow-lift"
            style={{
              left: Math.min(Math.max(pad.left + band * hover + band / 2, 60), width - 60),
              top: Math.max(y(data[hover].value) - 10, 36),
            }}
          >
            <p className="text-navy-300">{data[hover].detail ?? data[hover].label}</p>
            <p className="text-sm font-semibold tabular-nums">{format(data[hover].value)}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <table className="sr-only">
        {title && <caption>{title}</caption>}
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <th scope="row">{d.detail ?? d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Horizontal proportion bars for a handful of categories (e.g. status mix). */
export function BreakdownBars({ items, format = (v) => v }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  return (
    <ul ref={ref} className="space-y-3.5">
      {items.map((it, i) => (
        <li key={it.label}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-navy-700">{it.label}</span>
            <span className="font-semibold text-navy-900 tabular-nums">{format(it.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-navy-50">
            <motion.div
              className="h-full origin-left rounded-full"
              style={{ background: it.color ?? '#1a8d64' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: inView ? it.value / total : 0 }}
              transition={{ duration: 0.8, ease, delay: i * 0.08 }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
