// A soft, original music-box lullaby synthesised live with the Web Audio API,
// so there is no audio file to download and nothing plays until she taps "music".

const BPM = 72
const EIGHTH = 60 / BPM / 2

// I – vi – IV – V in C, voiced warmly (MIDI note numbers).
const CHORDS = [
  [48, 60, 64, 67, 71], // Cmaj7
  [45, 57, 60, 64, 67], // Am7
  [41, 57, 60, 65, 69], // Fmaj7 (add9 feel)
  [43, 55, 59, 62, 67], // G
]
// Arpeggio shape over the chord tones (index into chord, +12 = octave up).
const PATTERN = [1, 2, 3, 4, 3, 2, 4, 3]
// A little melody that sits on top, one note per beat (null = rest).
const MELODY = [
  [76, null, 74, 72], [72, null, 71, 69],
  [69, 72, 77, 76], [74, null, null, null],
  [76, 79, 76, 74], [72, null, 69, 72],
  [77, 76, 74, 72], [71, null, 74, null],
]

const freq = (m) => 440 * Math.pow(2, (m - 69) / 12)

export function createMusicBox() {
  let ac, master, delay, timer, pauseTimer
  let step = 0
  let nextTime = 0

  function setup() {
    ac = new (window.AudioContext || window.webkitAudioContext)()
    master = ac.createGain()
    master.gain.value = 0

    const lowpass = ac.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 3200

    // gentle echo for a dreamy room sound
    delay = ac.createDelay(1)
    delay.delayTime.value = EIGHTH * 3
    const feedback = ac.createGain()
    feedback.gain.value = 0.32
    const wet = ac.createGain()
    wet.gain.value = 0.28
    delay.connect(feedback).connect(delay)
    delay.connect(wet).connect(lowpass)

    master.connect(lowpass).connect(ac.destination)
    master.connect(delay)
  }

  function note(midi, time, { gain = 0.18, length = 1.6, type = 'sine' } = {}) {
    const osc = ac.createOscillator()
    const shimmer = ac.createOscillator()
    const env = ac.createGain()
    osc.type = type
    osc.frequency.value = freq(midi)
    shimmer.type = 'sine'
    shimmer.frequency.value = freq(midi) * 2.01 // bell-ish overtone
    const sg = ac.createGain()
    sg.gain.value = 0.18
    env.gain.setValueAtTime(0, time)
    env.gain.linearRampToValueAtTime(gain, time + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, time + length)
    osc.connect(env)
    shimmer.connect(sg).connect(env)
    env.connect(master)
    osc.start(time)
    shimmer.start(time)
    osc.stop(time + length + 0.05)
    shimmer.stop(time + length + 0.05)
  }

  function schedule() {
    while (nextTime < ac.currentTime + 0.15) {
      const bar = Math.floor(step / 8)
      const chord = CHORDS[bar % CHORDS.length]
      const i = step % 8

      if (i === 0) note(chord[0], nextTime, { gain: 0.16, length: 3.2, type: 'triangle' })
      note(chord[PATTERN[i]] + 12, nextTime, { gain: 0.07, length: 1.4 })
      if (i % 2 === 0) {
        const m = MELODY[bar % MELODY.length][i / 2]
        if (m) note(m + 12, nextTime, { gain: 0.1, length: 1.9 })
      }

      nextTime += EIGHTH
      step += 1
    }
  }

  return {
    async play() {
      if (!ac) setup()
      clearTimeout(pauseTimer)
      await ac.resume()
      nextTime = ac.currentTime + 0.05
      schedule()
      clearInterval(timer)
      timer = setInterval(schedule, 40)
      master.gain.cancelScheduledValues(ac.currentTime)
      master.gain.setValueAtTime(master.gain.value, ac.currentTime)
      master.gain.linearRampToValueAtTime(0.55, ac.currentTime + 2)
    },
    pause() {
      if (!ac) return
      master.gain.cancelScheduledValues(ac.currentTime)
      master.gain.setValueAtTime(master.gain.value, ac.currentTime)
      master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.6)
      clearTimeout(pauseTimer)
      pauseTimer = setTimeout(() => {
        clearInterval(timer)
        ac.suspend()
      }, 700)
    },
  }
}
