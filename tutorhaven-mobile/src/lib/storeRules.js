import { Platform } from 'react-native'

/**
 * Apple and Google require their own in-app purchase systems for digital
 * subscriptions bought inside native apps, so the iOS and Android apps don't sell
 * memberships or tutor subscriptions. People buy plans on the website; the apps
 * show the plan's status and apply its benefits. Paying for live tutoring
 * sessions (a person-to-person service) through Paystack is allowed in both stores.
 *
 * Set EXPO_PUBLIC_ALLOW_PLAN_PURCHASES=true to show the buy buttons while testing in Expo Go.
 */
export const PLAN_PURCHASES_IN_APP = Platform.OS === 'web' || process.env.EXPO_PUBLIC_ALLOW_PLAN_PURCHASES === 'true'
