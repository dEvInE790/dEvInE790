# A Little Question for You ❤️

A romantic, interactive invitation built with React, Tailwind CSS and Framer Motion.

- **Live (GitHub Pages):** `/come-over/`, the built output in `../come-over`
- **Source:** this folder

## The flow

1. **Envelope.** It floats and pulses. Tap it: the wax seal pops, the flap opens and the letter slides out.
2. **The question.** "Hey Hiqmoh, pretty girl ❤️", with YES ❤️ and NO 🙈 buttons.
   - **NO** runs away on hover (desktop), on touch (mobile) and on click or keyboard. It sometimes shrinks (never below 72%), never lands on YES, the message or the music button, and always stays fully on screen. Each try shows a random funny line, and YES gets a little bigger.
   - After 7 tries the button gives up, walks back home and works normally. A gentle, no-pressure screen then lets her say no for real (or change her mind). It stays a joke and never takes away her choice.
3. **YES.** Heart confetti, a denser wave of floating hearts, the celebration message and a "Let's make it happen ❤️" button. That button shows the "tell me when you're free" message, a little date ticket and a WhatsApp button.
4. **Music** (top right) is off by default. It's a soft music-box tune made live in the browser, so there's no audio file.

## Personalising

Everything personal is in [`src/config.js`](src/config.js):

- `WHATSAPP_NUMBER`: where her replies go (digits only, country code first). Set it to `''` to hide the WhatsApp buttons.
- `WHATSAPP_YES_TEXT` / `WHATSAPP_NO_TEXT`: the pre-filled messages.
- `NO_MESSAGES`: the lines the NO button says.
- `NO_ATTEMPTS_BEFORE_SURRENDER`: how many escapes before NO gives up.

## Develop and rebuild

```bash
cd come-over-src
npm install
npm run dev      # local preview with hot reload
npm run build    # writes the static site to ../come-over (commit that folder)
```
