"use client";
import { motion } from "framer-motion";
import { MEDIA } from "@/lib/media";
import { Eyebrow, SplitHeading } from "./Reveal";

const ease = [0.16, 1, 0.3, 1] as const;

/* Temporary wordmarks — replace by setting MEDIA.sponsors in src/lib/media.ts */
function TribeWaveMark() {
  return (
    <svg viewBox="0 0 360 120" className="relative h-20 w-auto max-w-full sm:h-24" role="img" aria-label="TribeWave Records">
      <g fill="none" stroke="#e10600" strokeWidth="6" strokeLinecap="round">
        <path d="M14 60 q12 -30 24 0 t24 0 t24 0 t24 0" />
        <path d="M14 82 q12 -18 24 0 t24 0 t24 0 t24 0" opacity=".5" />
      </g>
      <text x="128" y="62" fontFamily="var(--font-display)" fontSize="40" fill="#f4efe9" letterSpacing="2">TRIBEWAVE</text>
      <text x="130" y="90" fontFamily="var(--font-mono)" fontSize="15" fill="#e10600" letterSpacing="9">RECORDS</text>
    </svg>
  );
}
function MotionBoysMark() {
  return (
    <svg viewBox="0 0 360 120" className="relative h-20 w-auto max-w-full sm:h-24" role="img" aria-label="Motion Boys Squad">
      <rect x="10" y="18" width="84" height="84" rx="16" fill="#e10600" />
      <text x="52" y="76" textAnchor="middle" fontFamily="var(--font-display)" fontSize="40" fill="#050505">MBS</text>
      <text x="112" y="62" fontFamily="var(--font-display)" fontSize="38" fill="#f4efe9" letterSpacing="2">MOTION BOYS</text>
      <text x="114" y="90" fontFamily="var(--font-mono)" fontSize="15" fill="#e10600" letterSpacing="9">SQUAD</text>
    </svg>
  );
}

const sponsors = [
  { name: "TribeWave Records", role: "Sound & Music", logo: MEDIA.sponsors.tribewave, Mark: TribeWaveMark },
  { name: "Motion Boys Squad", role: "Hosts & Vibes", logo: MEDIA.sponsors.motionboys, Mark: MotionBoysMark },
];

export default function Sponsors() {
  return (
    <section id="sponsors" className="relative overflow-hidden px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Eyebrow>Presented by</Eyebrow>
        <SplitHeading text="THE CREWS BEHIND THE NIGHT" accent="CREWS" className="font-display text-5xl uppercase leading-[0.95] sm:text-7xl" />
        <div className="mt-12 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
          {sponsors.map((s, i) => (
            <motion.div
              key={s.name}
              className={`border-anim group relative flex flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl bg-ink-800/80 px-6 py-12 ${i === 1 ? "md:order-3" : ""}`}
              initial={{ opacity: 0, x: i ? 60 : -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 1, ease }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(225,6,0,.25),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              {s.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logo} alt={`${s.name} logo`} className="relative h-20 w-auto max-w-full object-contain sm:h-24" />
              ) : (
                <s.Mark />
              )}
              <div className="relative text-center">
                <p className="font-display text-xl uppercase tracking-wider">{s.name}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">{s.role}</p>
              </div>
            </motion.div>
          ))}
          <motion.div
            className="flex items-center justify-center py-2 font-graffiti text-6xl text-blood md:order-2 md:px-4"
            initial={{ scale: 0, rotate: -90 }}
            whileInView={{ scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.3 }}
            aria-hidden
          >
            ×
          </motion.div>
        </div>
      </div>
    </section>
  );
}
