import { motion } from 'framer-motion'
import Card, { rise, stagger } from './Card.jsx'
import ShareButtons from './ShareButtons.jsx'
import { WHATSAPP_NO_TEXT, whatsappLink } from '../config.js'

/** If she really means no, that's respected — kindly, with zero pressure. */
export default function GentleNo({ onBack }) {
  const wa = whatsappLink(WHATSAPP_NO_TEXT)
  return (
    <Card>
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.div variants={rise} className="text-5xl" aria-hidden="true">🌷</motion.div>
        <motion.h1 variants={rise} className="mt-4 font-serif text-3xl font-bold italic text-burgundy">
          That’s totally okay.
        </motion.h1>
        <motion.p variants={rise} className="mt-4 text-[0.98rem] font-light leading-relaxed text-burgundy/85">
          Thank you for being honest with me. No pressure at all, ever — I just wanted to ask. You’re still
          wonderful. 💛
        </motion.p>
        <motion.div variants={rise} className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <motion.button type="button" onClick={onBack} className="btn-yes" whileTap={{ scale: 0.95 }}>
            Actually… wait <span aria-hidden="true">🙈</span>
          </motion.button>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-soft">
              Send my answer <span aria-hidden="true">💌</span>
            </a>
          )}
        </motion.div>
        <motion.div variants={rise} className="mt-5">
          <ShareButtons text={WHATSAPP_NO_TEXT} />
        </motion.div>
      </motion.div>
    </Card>
  )
}
