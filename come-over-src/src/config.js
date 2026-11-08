// Everything personal lives here, so the site can be tweaked without
// touching any component code.

// WhatsApp number that her replies go to: digits only, country code first,
// no "+" or spaces. If set to '', "Send My Answer" lets her pick the chat herself
// and the "no" screen hides its WhatsApp button.
export const WHATSAPP_NUMBER = '2348028139086'

// Pre-filled WhatsApp message if she really says no (she can edit it before sending).
// The YES message is built from her chosen date in src/lib/dates.js.
export const WHATSAPP_NO_TEXT = "It's Hiqmoh, I saw your little website 🙈 Not this time, but thank you for asking 💛"

// Lines the NO button says while it runs away. Shown in random order.
export const NO_MESSAGES = [
  'Hiqmohhhh, don’t do this to me 😭',
  'Pretty girl, reconsider 😂❤️',
  'Are you really saying no to me?',
  'I promise we’ll have a lovely time 🥺',
  'Waittt, are you sure? 🥺',
  'Wrong button, pretty girl 😂',
  'My heart can’t take this.',
  'Give me a chance na 😭',
  'Think about the cuddles.',
  'You’re really going to break my heart? 💔',
  'I’ll even let you pick the movie 🥹',
  'One more chance? ❤️',
]

// After this many escapes the NO button gives up and becomes clickable,
// so it stays a joke and never takes her choice away.
export const NO_ATTEMPTS_BEFORE_SURRENDER = 7

// How far ahead she can pick a date.
export const MAX_MONTHS_AHEAD = 6

export const TIME_OPTIONS = [
  { id: 'afternoon', label: 'Afternoon', icon: '☀️' },
  { id: 'evening', label: 'Evening', icon: '🌙' },
  { id: 'night', label: 'Night', icon: '✨' },
]

export const whatsappLink = (text, { required = false } = {}) => {
  const q = `?text=${encodeURIComponent(text)}`
  if (WHATSAPP_NUMBER) return `https://wa.me/${WHATSAPP_NUMBER}${q}`
  return required ? `https://wa.me/${q}` : null // no number: WhatsApp asks her who to send it to
}
