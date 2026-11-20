"use client";
import { motion } from "framer-motion";
import { MEDIA } from "@/lib/media";
import { Eyebrow, SplitHeading, stagger } from "./Reveal";

const ease = [0.16, 1, 0.3, 1] as const;

/* --- small animated illustrations (vector, so they cost nothing to load) --- */
function Drinks() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <path d="M30 30 h60 l-26 38 v22 h14 v6 H42 v-6 h14 V68 Z" fill="none" stroke="#f4efe9" strokeWidth="3" strokeLinejoin="round" />
      <path d="M38 38 h44 l-22 26 Z" fill="#e10600" opacity=".9" />
      <circle cx="84" cy="26" r="7" fill="none" stroke="#e10600" strokeWidth="3" />
      <line x1="60" y1="50" x2="92" y2="16" stroke="#f4efe9" strokeWidth="2.5" strokeLinecap="round" />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={52 + i * 6} cy={56} r={1.8 + (i % 2)} fill="#fff" style={{ animation: `rise ${1.8 + i * 0.3}s ease-in ${i * 0.4}s infinite`, transformBox: "fill-box" }} />
      ))}
    </svg>
  );
}
function Music() {
  return (
    <div className="flex h-full w-full items-end justify-center gap-[6%] pb-[18%]" aria-hidden>
      {[0.5, 0.9, 0.65, 1, 0.75, 0.55, 0.85].map((h, i) => (
        <span
          key={i}
          className="w-[7%] origin-bottom rounded-full bg-gradient-to-t from-blood-700 via-blood to-[#ff8a80]"
          style={{ height: `${h * 70}%`, animation: `eq ${0.7 + (i % 3) * 0.2}s ease-in-out ${i * 0.09}s infinite` }}
        />
      ))}
    </div>
  );
}
function Games() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <g style={{ transformOrigin: "45px 62px", animation: "wave-l 2.4s ease-in-out infinite" }}>
        <rect x="22" y="38" width="44" height="60" rx="6" fill="#f4efe9" transform="rotate(-14 44 68)" />
        <text x="30" y="62" fontSize="16" fill="#e10600" fontFamily="var(--font-display)" transform="rotate(-14 44 68)">A</text>
        <path d="M44 74 l6 8 -6 8 -6 -8z" fill="#e10600" transform="rotate(-14 44 68)" />
      </g>
      <g style={{ transformOrigin: "84px 66px", animation: "spin-slow 6s linear infinite" }}>
        <rect x="64" y="46" width="40" height="40" rx="8" fill="#e10600" />
        {[[74, 56], [94, 56], [84, 66], [74, 76], [94, 76]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.6" fill="#050505" />
        ))}
      </g>
    </svg>
  );
}
function Performances() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="spot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff3b30" stopOpacity=".8" />
          <stop offset="1" stopColor="#ff3b30" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M60 0 L96 120 H24 Z" fill="url(#spot)" style={{ transformOrigin: "60px 0", animation: "beam 4s ease-in-out infinite" }} />
      <rect x="50" y="30" width="20" height="34" rx="10" fill="#f4efe9" />
      <path d="M44 52 a16 16 0 0032 0" fill="none" stroke="#f4efe9" strokeWidth="3" />
      <line x1="60" y1="68" x2="60" y2="96" stroke="#f4efe9" strokeWidth="3" />
      <line x1="46" y1="96" x2="74" y2="96" stroke="#f4efe9" strokeWidth="3" strokeLinecap="round" />
      {[38, 82].map((x, i) => (
        <path key={x} d={`M${x} ${40 + i * 6} q ${i ? 6 : -6} 8 0 16`} fill="none" stroke="#e10600" strokeWidth="2.5" strokeLinecap="round" className="animate-flicker" />
      ))}
    </svg>
  );
}
function More() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      {[
        [60, 58, 20, 0], [30, 36, 9, 0.4], [92, 34, 11, 0.8], [88, 88, 8, 1.2], [32, 86, 12, 0.6],
      ].map(([x, y, r, d], i) => (
        <path
          key={i}
          d={`M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z`}
          fill={i === 0 ? "#e10600" : "#f4efe9"}
          style={{ transformOrigin: `${x}px ${y}px`, animation: `pulse-star 2.2s ease-in-out ${d}s infinite` }}
        />
      ))}
      <style>{`@keyframes pulse-star{0%,100%{transform:scale(.7) rotate(0);opacity:.6}50%{transform:scale(1.1) rotate(45deg);opacity:1}}`}</style>
    </svg>
  );
}

const items = [
  { key: "drinks", title: "Drinks", copy: "Cold bottles, mixes and shots flowing all night.", Art: Drinks },
  { key: "music", title: "Music", copy: "Afrobeats, amapiano & street anthems — loud.", Art: Music },
  { key: "games", title: "Games", copy: "Cards, dares and party games that get krazy.", Art: Games },
  { key: "performances", title: "Performances", copy: "Live sets and surprise acts from the squad.", Art: Performances },
  { key: "more", title: "And more", copy: "Some things you only find out when you're inside.", Art: More },
] as const;

export default function Expect() {
  return (
    <section id="expect" className="relative overflow-hidden px-4 py-24 sm:px-6 sm:py-32">
      <div className="pointer-events-none absolute right-[-10%] top-1/3 h-[30rem] w-[30rem] rounded-full bg-blood/15 blur-[140px]" />
      <div className="relative mx-auto max-w-6xl">
        <Eyebrow>What to expect</Eyebrow>
        <SplitHeading text="WHAT GOES DOWN INSIDE" accent="DOWN" className="font-display text-5xl uppercase leading-[0.95] sm:text-7xl" />

        <motion.ul
          className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10% 0px" }}
          variants={stagger(0.1)}
        >
          {items.map(({ key, title, copy, Art }, i) => {
            const img = MEDIA.expect[key];
            return (
              <motion.li
                key={key}
                variants={{
                  hidden: { opacity: 0, y: 60, scale: 0.94 },
                  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease } },
                }}
                whileHover={{ y: -8, rotate: i % 2 ? 1 : -1 }}
                className={`group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-ink-700 to-ink-900 ${
                  i === 4 ? "col-span-2 lg:col-span-1" : ""
                }`}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_50%_70%,rgba(225,6,0,.35),transparent_65%)] lg:aspect-square">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                  ) : (
                    <div className="absolute inset-[14%] transition-transform duration-700 group-hover:scale-110">
                      <Art />
                    </div>
                  )}
                  <span className="absolute left-3 top-3 font-mono text-[10px] tracking-[0.3em] text-white/40">0{i + 1}</span>
                </div>
                <div className="relative flex-1 p-4 sm:p-5">
                  <h3 className="font-display text-2xl uppercase tracking-wide text-white transition-colors group-hover:text-blood sm:text-3xl">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm leading-snug text-white/55">{copy}</p>
                </div>
                <span className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-blood transition-transform duration-500 group-hover:scale-x-100" />
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}
