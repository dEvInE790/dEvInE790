import { initials } from '../../lib/format'

// Deterministic, on-brand gradients so every tutor has a distinctive avatar
// even without a photo.
const palettes = [
  ['#0f1c36', '#27ae7c'],
  ['#182746', '#4a5f8f'],
  ['#1a8d64', '#7fdcb8'],
  ['#24365c', '#9aabcf'],
  ['#165a43', '#4cc897'],
  ['#344874', '#b0ebd3'],
]
function hash(s = '') {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const sizes = { xs: 'h-7 w-7 text-[0.65rem]', sm: 'h-9 w-9 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-16 w-16 text-lg', xl: 'h-24 w-24 text-2xl' }

export default function Avatar({ name = '', src, seed, size = 'md', className = '', ring = false }) {
  const [a, b] = palettes[hash(seed || name) % palettes.length]
  const cls = `relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-display font-bold text-white ${sizes[size]} ${ring ? 'ring-4 ring-white' : ''} ${className}`
  if (src) return <img src={src} alt="" className={`${cls} object-cover`} loading="lazy" />
  return (
    <span className={cls} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} aria-hidden>
      {initials(name)}
    </span>
  )
}
