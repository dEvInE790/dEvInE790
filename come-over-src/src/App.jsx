import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Background from './components/Background.jsx'
import Envelope from './components/Envelope.jsx'
import Question from './components/Question.jsx'
import Celebration from './components/Celebration.jsx'
import GentleNo from './components/GentleNo.jsx'
import MusicToggle from './components/MusicToggle.jsx'
import { celebrate } from './lib/heartConfetti.js'

// envelope → question → yes | no (and no → question again if she changes her mind)
export default function App() {
  const [screen, setScreen] = useState('envelope')
  const musicRef = useRef(null)
  const openLetter = useCallback(() => setScreen('question'), [])

  return (
    <>
      <Background celebrate={screen === 'yes'} />
      <MusicToggle innerRef={musicRef} />

      <main className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-4 pb-10 pt-16 sm:py-20">
        <AnimatePresence mode="wait">
          {screen === 'envelope' && (
            <motion.div key="envelope" className="flex flex-col items-center" exit={{ opacity: 0 }}>
              <motion.p
                className="text-center font-serif text-[1.9rem] italic leading-tight text-burgundy drop-shadow-sm sm:text-4xl"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.2 }}
              >
                A little question
                <br />
                for you <span className="not-italic">❤️</span>
              </motion.p>
              <Envelope onOpened={openLetter} />
            </motion.div>
          )}
          {screen === 'question' && (
            <Question key="question" musicRef={musicRef} onYes={() => {
                celebrate() // confetti the instant she taps, no waiting for the next screen
                setScreen('yes')
              }} onNo={() => setScreen('no')} />
          )}
          {screen === 'yes' && <Celebration key="yes" />}
          {screen === 'no' && <GentleNo key="no" onBack={() => setScreen('question')} />}
        </AnimatePresence>
      </main>
    </>
  )
}
