"use client";
import { motion } from "framer-motion";
import { EVENT, mapsUrl } from "@/lib/event";
import { Eyebrow, SplitHeading, stagger } from "./Reveal";
import SpotsCounter from "./SpotsCounter";
import { useStatus } from "./useStatus";

const ease = [0.16, 1, 0.3, 1] as const;

const baseCards = [
  { k: "Date", big: "17", sub: "December", note: "Thursday", icon: "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" },
  { k: "Time", big: "4PM", sub: "till 10PM", note: "6 hours non-stop", icon: "M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z" },
  { k: "Capacity", big: "", sub: "People only", note: "Once it's full, it's full", icon: "M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M10 11a4 4 0 100-8 4 4 0 000 8zM21 20v-1a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8" },
];

function icsHref() {
  const f = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Krazy Hours//EN", "BEGIN:VEVENT",
    "UID:krazy-hours-2026@krazyhours", "DTSTAMP:20261101T000000Z",
    `DTSTART:${f(EVENT.startsAt)}`, `DTEND:${f(EVENT.endsAt)}`,
    "SUMMARY:KRAZY HOURS — Apartment Party", `LOCATION:${EVENT.address.replace(/,/g, "\\,")}`,
    "DESCRIPTION:TribeWave Records × Motion Boys Squad. Only 35 people allowed.",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
}

export default function EventInfo() {
  const { status } = useStatus();
  const capacity = status?.capacity ?? EVENT.capacity;
  const cards = baseCards.map((c) => (c.k === "Capacity" ? { ...c, big: String(capacity) } : c));
  return (
    <section id="details" className="relative overflow-hidden px-4 py-24 sm:px-6 sm:py-32">
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-blood/20 blur-[120px]" />
      <div className="relative mx-auto max-w-6xl">
        <Eyebrow>The details</Eyebrow>
        <SplitHeading
          text={`ONE NIGHT. ONE APARTMENT. ${capacity} PEOPLE.`}
          accent={String(capacity)}
          className="max-w-4xl font-display text-5xl uppercase leading-[0.95] sm:text-7xl"
        />

        <motion.div
          className="mt-12 grid gap-4 sm:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10% 0px" }}
          variants={stagger(0.12)}
        >
          {cards.map((c) => (
            <motion.div
              key={c.k}
              variants={{ hidden: { opacity: 0, y: 50, rotateX: -20 }, show: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.9, ease } } }}
              whileHover={{ y: -6 }}
              className="border-anim group relative overflow-hidden rounded-3xl bg-ink-800/80 p-6 [transform-perspective:800px] sm:p-8"
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blood/0 blur-3xl transition-colors duration-500 group-hover:bg-blood/30" />
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/50">{c.k}</span>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e10600" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={c.icon} />
                </svg>
              </div>
              <p className="mt-6 font-display text-7xl leading-none text-white sm:text-6xl lg:text-7xl">{c.big}</p>
              <p className="mt-1 font-display text-2xl uppercase text-blood">{c.sub}</p>
              <p className="mt-4 text-sm text-white/50">{c.note}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Location */}
        <motion.div
          className="mt-4 grid overflow-hidden rounded-3xl border border-white/10 bg-ink-800/80 md:grid-cols-[1.1fr_1fr]"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.9, ease }}
        >
          <div className="p-6 sm:p-10">
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/50">Location</span>
            <p className="mt-4 font-display text-3xl uppercase leading-tight sm:text-4xl">
              Road 13, Block 13,
              <br />
              <span className="text-blood">Diamond Estate</span>, Isheri
            </p>
            <p className="mt-3 text-white/60">Opposite Jendol Supermarket</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-red">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 21s-7-6.2-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.8 12 21 12 21z" />
                  <circle cx="12" cy="9.5" r="2.5" />
                </svg>
                Open in Google Maps
              </a>
              <a href={icsHref()} download="krazy-hours.ics" className="btn btn-ghost">
                Add to calendar
              </a>
            </div>
            <SpotsCounter className="mt-8" />
          </div>

          {/* stylised map */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block min-h-[260px] overflow-hidden bg-[#0b0b0b]"
            aria-label="Open the location in Google Maps"
          >
            <svg className="absolute inset-0 h-full w-full transition-transform duration-[1.5s] group-hover:scale-110" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
              <defs>
                <pattern id="blocks" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
                  <rect width="40" height="40" fill="#0b0b0b" />
                  <rect x="4" y="4" width="32" height="32" rx="3" fill="#141414" />
                </pattern>
              </defs>
              <rect width="400" height="300" fill="url(#blocks)" />
              <path d="M-20 210 C 80 190, 160 230, 260 170 S 380 120, 430 140" stroke="#2a2a2a" strokeWidth="18" fill="none" />
              <path d="M-20 210 C 80 190, 160 230, 260 170 S 380 120, 430 140" stroke="#3a0b09" strokeWidth="2" strokeDasharray="8 8" fill="none" />
              <path d="M150 -10 L 190 320" stroke="#232323" strokeWidth="12" />
              <motion.path
                d="M40 280 C 90 240, 120 230, 150 200 S 200 150, 214 140"
                stroke="#e10600"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="2 8"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
              <text x="235" y="112" fill="#666" fontSize="9" fontFamily="monospace">JENDOL</text>
              <rect x="226" y="100" width="6" height="6" fill="#444" />
            </svg>
            <div className="absolute left-[53%] top-[46%] -translate-x-1/2 -translate-y-full">
              <span className="absolute left-1/2 top-full h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-blood/50" />
              <svg width="38" height="48" viewBox="0 0 24 30" aria-hidden className="relative drop-shadow-[0_0_12px_rgba(225,6,0,.9)]">
                <path d="M12 29s-10-9-10-17a10 10 0 1120 0c0 8-10 17-10 17z" fill="#e10600" />
                <circle cx="12" cy="12" r="4" fill="#050505" />
              </svg>
            </div>
            <span className="absolute bottom-4 right-4 rounded-full bg-black/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-white/80 backdrop-blur">
              Tap for directions ↗
            </span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
