import { motion } from 'motion/react'
import { spring } from '../../motion/variants'

export default function Card({ children, className = '', interactive = false, as = 'div', ...rest }) {
  const Tag = motion[as] ?? motion.div
  return (
    <Tag
      className={`card ${interactive ? 'transition-shadow duration-300 hover:shadow-lift' : ''} ${className}`}
      {...(interactive ? { whileHover: { y: -4 }, transition: spring } : {})}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-navy-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
