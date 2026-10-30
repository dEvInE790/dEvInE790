const tones = {
  mint: 'bg-mint-50 text-mint-700 ring-mint-600/15',
  navy: 'bg-navy-50 text-navy-700 ring-navy-600/15',
  amber: 'bg-amber-400/15 text-[#8a5a00] ring-amber-500/20',
  coral: 'bg-coral-50 text-coral-600 ring-coral-500/20',
  neutral: 'bg-cream-200 text-navy-700 ring-navy-900/5',
  dark: 'bg-navy-900 text-white ring-navy-900',
}

export default function Badge({ tone = 'neutral', children, icon: Icon, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tones[tone]} ${className}`}>
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </span>
  )
}

const statusMap = {
  pending_payment: ['amber', 'Awaiting payment'],
  confirmed: ['mint', 'Confirmed'],
  completed: ['navy', 'Completed'],
  cancelled: ['neutral', 'Cancelled'],
}
export function StatusBadge({ status }) {
  const [tone, label] = statusMap[status] ?? ['neutral', status]
  return <Badge tone={tone}>{label}</Badge>
}
