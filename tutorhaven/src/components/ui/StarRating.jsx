import { useState } from 'react'
import { motion } from 'motion/react'
import { Star } from 'lucide-react'

export function Stars({ value = 0, size = 14, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${Number(value).toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i + 1))
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }} aria-hidden>
            <Star className="absolute inset-0 text-navy-200" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="text-amber-400" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        )
      })}
    </span>
  )
}

export function RatingInput({ value, onChange }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Outstanding']
  return (
    <div>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(i)}
            onClick={() => onChange(i)}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className="rounded-md p-0.5"
          >
            <Star className={`h-8 w-8 transition-colors ${i <= shown ? 'text-amber-400' : 'text-navy-200'}`} fill="currentColor" strokeWidth={0} />
          </motion.button>
        ))}
      </div>
      <p className="mt-1 h-5 text-sm font-medium text-navy-500">{labels[shown]}</p>
    </div>
  )
}
