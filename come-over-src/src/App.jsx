import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Background from './components/Background.jsx'
import Envelope from './components/Envelope.jsx'
import Question from './components/Question.jsx'
import Celebration from './components/Celebration.jsx'
import GentleNo from './components/GentleNo.jsx'
import DatePicker from './components/DatePicker.jsx'
import DateConfirmed from './components/DateConfirmed.jsx'
import MusicToggle from './components/MusicToggle.jsx'
import { celebrate } from './lib/heartConfetti.js'

// envelope → question → yes → date → confirmed
//                     ↘ no → (back to question if she changes her mind)
export default function App() {
  const [screen, setScreen] = useState('envelope')
  const [plan, setPlan] = useState({ date: null, time: null, note: '' })
  const musicRef = useRef(null)
  const openLetter = useCallback(() => setScreen('question'), [])

  // Each new screen starts at the top (the date picker is taller than most phones).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [screen])

  return (
    <>
      <Background celebrate={screen === 'yes' || screen === 'confirmed'} />
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
                Hiqmoh, I have a
                <br />
                little question for you <span className="not-italic">💌</span>
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
          {screen === 'yes' && <Celebration key="yes" onNext={() => setScreen('date')} />}
          {screen === 'date' && (
            <DatePicker key="date" plan={plan} onChange={setPlan} onConfirm={() => setScreen('confirmed')} />
          )}
          {screen === 'confirmed' && <DateConfirmed key="confirmed" plan={plan} onEdit={() => setScreen('date')} />}
          {screen === 'no' && <GentleNo key="no" onBack={() => setScreen('question')} />}
        </AnimatePresence>
      </main>
    </>
  )
}
