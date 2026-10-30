// Shared motion language: one easing curve and a small set of durations keep
// every animation in the product feeling related.
export const ease = [0.22, 1, 0.36, 1]
export const spring = { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }
export const softSpring = { type: 'spring', stiffness: 220, damping: 26 }

export const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease } },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease } },
}

export const stagger = (staggerChildren = 0.07, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
})

export const hoverLift = { y: -4, transition: spring }
export const tapPress = { scale: 0.97 }
