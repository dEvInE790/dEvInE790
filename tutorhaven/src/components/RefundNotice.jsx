import { Link } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'

const linkCls = 'font-semibold text-navy-800 underline underline-offset-2 hover:text-mint-700'

/**
 * Refund and renewal terms shown next to every "Pay" button, so customers see
 * them before they are sent to Paystack.
 *  - kind="session": cancellation windows; `member` uses the 2-hour window.
 *  - kind="plan": memberships and tutor subscriptions; `period` like "1 month".
 */
export default function RefundNotice({ kind = 'session', member = false, period, className = '' }) {
  return (
    <div className={`rounded-xl border border-navy-900/8 bg-white p-3.5 text-xs leading-relaxed text-navy-600 ${className}`} data-testid="refund-notice">
      <p className="flex items-center gap-1.5 font-semibold text-navy-900"><RotateCcw className="h-3.5 w-3.5 text-mint-600" />Refunds & renewal</p>
      {kind === 'session' ? (
        <ul className="mt-1.5 list-disc space-y-1 pl-4">
          <li>Full refund if you cancel at least <strong>{member ? '2 hours' : '24 hours'}</strong> before the start{member ? ' (member benefit)' : ''}.</li>
          <li>Full refund if the tutor cancels, or if you are charged twice or in error.</li>
          <li>After that, sessions can’t be cancelled or refunded, except where the law requires it.</li>
        </ul>
      ) : (
        <ul className="mt-1.5 list-disc space-y-1 pl-4">
          <li><strong>Non-refundable once paid</strong>, except where required by law.</li>
          <li>This payment covers {period ?? 'the period shown'}. <strong>Nothing renews automatically</strong>; we remind you before it ends.</li>
          <li>If you cancel, your access continues until the end of the paid period.</li>
        </ul>
      )}
      <p className="mt-2">
        By paying you agree to our <Link to="/terms" target="_blank" className={linkCls}>Terms</Link> and <Link to="/refunds" target="_blank" className={linkCls}>Refund Policy</Link>.
      </p>
    </div>
  )
}
