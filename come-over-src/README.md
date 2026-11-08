# A Little Question for You ❤️

A romantic, interactive invitation built with React, Tailwind CSS and Framer Motion.

- **Live (GitHub Pages):** `/come-over/`, the built output in `../come-over`
- **Source:** this folder

## The flow

1. **Envelope.** It floats and pulses. Tap it: the wax seal pops, the flap opens and the letter slides out.
2. **The question.** "Hey Hiqmoh, pretty girl ❤️", with YES ❤️ and NO 🙈 buttons.
   - **NO** runs away on hover (desktop), on touch (mobile) and on click or keyboard. It sometimes shrinks (never below 72%), never lands on YES, the message or the music button, and always stays fully on screen. Each try shows a random funny line, and YES gets a little bigger.
   - After 7 tries the button gives up, walks back home and works normally. A gentle, no-pressure screen then lets her say no for real (or change her mind). It stays a joke and never takes away her choice.
3. **YES.** Heart confetti, a denser wave of floating hearts, the celebration message and a "Let's make it happen ❤️" button.
4. **Date picker.** "Okay, Hiqmoh, one more little question… 🥹❤️". It has a month calendar (past days are disabled, and she can look up to 6 months ahead), Afternoon ☀️ / Evening 🌙 / Night ✨, and an optional "Anything you'd like us to plan? 👀" note. "That's Our Date ❤️" unlocks once a date and a time are picked.
5. **Confirmation.** "It's a date, Hiqmoh! ❤️", with a ticket showing her date, time and note. "Send My Answer 💌" opens WhatsApp with all of it already typed. Under it, "Share 📤" opens the phone's share menu (Instagram, Snapchat, texts…) and "Copy message 📋" copies it to paste anywhere. The "no" screen has the same options. Finally, "Change something ✏️" goes back with her choices kept.
6. **Music** (top right) is off by default. It's a soft music-box tune made live in the browser, so there's no audio file.

## Personalising

Everything personal is in [`src/config.js`](src/config.js):

- `WHATSAPP_NUMBER`: where her replies go (digits only, country code first). Set it to `''` to hide the WhatsApp buttons.
- `WHATSAPP_NO_TEXT`: the pre-filled message if she really says no. The date message is built in `src/lib/dates.js` (`buildAnswerMessage`).
- `MAX_MONTHS_AHEAD` and `TIME_OPTIONS`: the calendar range and the time choices.
- `NO_MESSAGES`: the lines the NO button says.
- `NO_ATTEMPTS_BEFORE_SURRENDER`: how many escapes before NO gives up.

## Develop and rebuild

```bash
cd come-over-src
npm install
npm run dev      # local preview with hot reload
npm run build    # writes the static site to ../come-over (commit that folder)
```
