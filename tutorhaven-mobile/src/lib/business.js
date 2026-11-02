// Business contact details (from platform_settings, editable in the web admin
// panel under Business & policies). Policy pages open on the website.
import { Linking } from 'react-native'
import * as WebBrowser from 'expo-web-browser'

export const BUSINESS_DEFAULTS = {
  business_name: 'TutorHaven',
  operator_name: 'Ojigbani Divine',
  support_email: 'tutorhaven737@gmail.com',
  support_phone: '+2348028139086',
  whatsapp_number: '+2348028139086',
  business_city: 'Lagos',
  business_state: 'Lagos State',
  business_country: 'Nigeria',
}

export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || 'https://tutorhaven.pages.dev').replace(/\/$/, '')

export const POLICY_PATHS = { terms: '/terms', privacy: '/privacy', refund: '/refunds', contact: '/contact' }

/** +2348028139086 → 0802 813 9086; other numbers unchanged. */
export function localPhone(intl = '') {
  const m = intl.match(/^\+234(\d{3})(\d{3})(\d{4})$/)
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : intl
}

export function businessInfo(settings = {}) {
  const b = { ...BUSINESS_DEFAULTS }
  for (const k of Object.keys(b)) if (settings[k]) b[k] = settings[k]
  return {
    ...b,
    location: `${b.business_city}, ${b.business_state}, ${b.business_country}`,
    phoneDisplay: localPhone(b.support_phone),
    whatsappDisplay: localPhone(b.whatsapp_number),
  }
}

export const whatsappLink = (number, text = '') =>
  `https://wa.me/${String(number).replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`

export const openPolicy = (kind) => WebBrowser.openBrowserAsync(`${SITE_URL}${POLICY_PATHS[kind]}`).catch(() => Linking.openURL(`${SITE_URL}${POLICY_PATHS[kind]}`))
export const openWhatsApp = (info, text) => Linking.openURL(whatsappLink(info.whatsapp_number, text ?? `Hello ${info.business_name}, `))
export const openEmail = (info, subject) => Linking.openURL(`mailto:${info.support_email}?subject=${encodeURIComponent(subject ?? `${info.business_name} support`)}`)
export const openPhone = (info) => Linking.openURL(`tel:${info.support_phone}`)
