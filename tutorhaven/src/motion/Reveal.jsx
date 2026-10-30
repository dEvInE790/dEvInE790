import { motion } from 'motion/react'
import { fadeUp, stagger } from './variants'

const viewport = { once: true, margin: '0px 0px -12% 0px' }

/** Fades content up once it scrolls into view. */
export function Reveal({ as = 'div', children, delay = 0, y = 18, className = '', ...rest }) {
  const Tag = motion[as] ?? motion.div
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** Parent that staggers its <StaggerItem> children on scroll-in (or on mount). */
export function Stagger({ as = 'div', children, className = '', gap = 0.07, delay = 0, onMount = false, ...rest }) {
  const Tag = motion[as] ?? motion.div
  const trigger = onMount ? { animate: 'show' } : { whileInView: 'show', viewport }
  return (
    <Tag className={className} variants={stagger(gap, delay)} initial="hidden" {...trigger} {...rest}>
      {children}
    </Tag>
  )
}

export function StaggerItem({ as = 'div', children, className = '', variants = fadeUp, ...rest }) {
  const Tag = motion[as] ?? motion.div
  return (
    <Tag className={className} variants={variants} {...rest}>
      {children}
    </Tag>
  )
}
