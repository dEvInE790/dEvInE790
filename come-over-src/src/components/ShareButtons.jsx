import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const canShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function'

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Older browsers / non-secure contexts: the classic hidden-textarea trick.
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

/**
 * Other ways to send her answer besides WhatsApp:
 *  - "Share" opens the phone's own share sheet (Instagram, Snapchat, SMS, …), shown only where supported
 *  - "Copy" puts the message on her clipboard to paste anywhere
 */
export default function ShareButtons({ text, title = 'My answer 💌' }) {
  const [copied, setCopied] = useState(false)
  const [sharable] = useState(canShare)

  const share = async () => {
    try {
      await navigator.share({ title, text })
    } catch (err) {
      // She closed the sheet (AbortError) — nothing to do. Anything else: fall back to copying.
      if (err?.name !== 'AbortError') copy()
    }
  }

  const copy = async () => {
    if (await copyText(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    }
  }

  const small =
    'btn-soft px-5 py-2.5 text-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-rose/40'

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-burgundy/55">or send it another way</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {sharable && (
          <motion.button type="button" onClick={share} className={small} whileTap={{ scale: 0.95 }}>
            Share <span aria-hidden="true">📤</span>
          </motion.button>
        )}
        <motion.button type="button" onClick={copy} className={small} whileTap={{ scale: 0.95 }} aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={copied ? 'done' : 'copy'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {copied ? 'Copied! ✓' : <>Copy message <span aria-hidden="true">📋</span></>}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  )
}
