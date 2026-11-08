// Everything personal lives here, so the site can be tweaked without
// touching any component code.

// WhatsApp number that her replies go to: digits only, country code first,
// no "+" or spaces. Set to '' to hide the WhatsApp buttons completely.
export const WHATSAPP_NUMBER = '2348028139086'

// Pre-filled WhatsApp messages (she can edit them before sending).
export const WHATSAPP_YES_TEXT = "Hey you 🥹 I said YES ❤️ I'm free on…"
export const WHATSAPP_NO_TEXT = "Hey, I saw your little website 🙈 Not this time, but thank you for asking 💛"

// Lines the NO button says while it runs away. Shown in random order.
export const NO_MESSAGES = [
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

export const whatsappLink = (text) =>
  WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}` : null
