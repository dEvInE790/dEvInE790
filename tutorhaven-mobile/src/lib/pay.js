import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { payForBooking, startPaystackCheckout, subscribe, verifyPaystack } from './api'

/**
 * Opens Paystack's secure checkout in an in-app browser. Paystack returns to our
 * callback, which redirects back into the app; we then confirm the payment on the
 * server. Returns { status: 'succeeded' | 'refund_pending' | 'failed' | 'abandoned', note? }.
 */
export async function payWithPaystack({ kind, bookingId = null, plan = null }) {
  const redirectUrl = Linking.createURL('payment')
  const { authorization_url, reference } = await startPaystackCheckout({ kind, bookingId, plan, redirectUrl })
  await WebBrowser.openAuthSessionAsync(authorization_url, redirectUrl)
  try {
    return await verifyPaystack(reference)
  } catch (e) {
    return { status: 'failed', note: e.message }
  }
}

/** Test mode (switched on by an admin) records the payment without charging. */
export async function payBooking(bookingId, testMode) {
  if (testMode) {
    await payForBooking(bookingId)
    return { status: 'succeeded' }
  }
  return payWithPaystack({ kind: 'session', bookingId })
}

export async function payMembership(plan, testMode) {
  if (testMode) {
    await subscribe(plan)
    return { status: 'succeeded' }
  }
  return payWithPaystack({ kind: 'subscription', plan })
}
