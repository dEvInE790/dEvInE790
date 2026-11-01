import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { startPaystackCheckout, verifyPaystack } from './api'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Opens Paystack's secure checkout in an in-app browser. When it closes, the
 * server verifies the payment with Paystack; that answer is the only one we show.
 * Returns { status: 'succeeded' | 'refund_pending' | 'pending' | 'failed' | 'abandoned', reason?, reference }.
 */
export async function payWithPaystack({ kind, bookingId = null, planId = null }) {
  const redirectUrl = Linking.createURL('payment')
  const { authorization_url, reference } = await startPaystackCheckout({ kind, bookingId, planId, redirectUrl })
  await WebBrowser.openAuthSessionAsync(authorization_url, redirectUrl)
  // Bank transfers and USSD can take a moment to confirm: check a few times.
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await verifyPaystack(reference)
      if (r.status !== 'pending' || attempt >= 3) return { ...r, reference }
    } catch (e) {
      return { status: 'pending', reason: e.message, reference }
    }
    await wait(2500)
  }
}

export const payBooking = (bookingId) => payWithPaystack({ kind: 'session', bookingId })
export const payPlan = (planId) => payWithPaystack({ kind: 'subscription', planId })

/** User-facing copy for each server-confirmed outcome. */
export function describePayment(r, kind = 'session') {
  switch (r?.status) {
    case 'succeeded':
      return { ok: true, title: kind === 'session' ? 'You’re booked!' : 'Your plan is active', body: 'Paystack confirmed your payment.' }
    case 'refund_pending':
      return { ok: false, title: 'Payment received, but the slot was taken', body: `${r.reason || 'Someone booked this time while you were paying'}. You’ll be refunded in full.` }
    case 'pending':
      return { ok: false, title: 'Payment is still processing', body: 'Paystack hasn’t confirmed it yet. You’ll get a notification once it’s confirmed.' }
    case 'abandoned':
      return { ok: false, title: 'Payment not completed', body: 'The checkout was closed before paying. You haven’t been charged.' }
    default:
      return { ok: false, title: 'Payment failed', body: `${r?.reason || 'Your payment was declined'}. You haven’t been charged.` }
  }
}
