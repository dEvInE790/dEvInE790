import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { LoaderCircle } from 'lucide-react'
import { spring } from '../../motion/variants'

const variants = {
  primary: 'bg-navy-900 text-white hover:bg-navy-800 shadow-[0_8px_20px_-8px_rgb(15_28_54/0.5)]',
  mint: 'bg-mint-400 text-navy-950 hover:bg-mint-300 shadow-glow',
  secondary: 'bg-white text-navy-900 border border-navy-900/10 hover:border-navy-900/20 hover:bg-cream-50 shadow-soft',
  ghost: 'text-navy-700 hover:bg-navy-900/[0.05]',
  danger: 'bg-coral-50 text-coral-600 hover:bg-coral-500 hover:text-white',
  light: 'bg-white/10 text-white border border-white/15 hover:bg-white/15 backdrop-blur',
}
const sizes = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-[0.95rem] gap-2 rounded-xl',
  lg: 'h-13 px-7 text-base gap-2.5 rounded-2xl',
  icon: 'h-10 w-10 rounded-xl',
}

const MotionLink = motion.create(Link)

/** Button with tactile hover/tap feedback. Pass `to` for a router link or `href` for an anchor. */
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className = '', children, to, href, icon: Icon, iconRight: IconRight, ...rest },
  ref,
) {
  const cls = `relative inline-flex select-none items-center justify-center font-semibold whitespace-nowrap transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant]} ${sizes[size]} ${className}`
  const isDisabled = disabled || loading
  const motionProps = isDisabled ? {} : { whileHover: { y: -1.5 }, whileTap: { scale: 0.97, y: 0 }, transition: spring }
  const content = (
    <>
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : Icon ? <Icon className="h-[1.1em] w-[1.1em]" aria-hidden /> : null}
      {children}
      {IconRight && !loading ? <IconRight className="h-[1.1em] w-[1.1em]" aria-hidden /> : null}
    </>
  )
  if (to) return <MotionLink ref={ref} to={to} className={cls} {...motionProps} {...rest}>{content}</MotionLink>
  if (href) return <motion.a ref={ref} href={href} className={cls} {...motionProps} {...rest}>{content}</motion.a>
  return (
    <motion.button ref={ref} type="button" className={cls} disabled={isDisabled} aria-busy={loading || undefined} {...motionProps} {...rest}>
      {content}
    </motion.button>
  )
})

export default Button
