"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { EVENT, mapsUrl } from "@/lib/event";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/5 px-4 pb-10 pt-20 sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(225,6,0,.25),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl text-center">
        <motion.p
          className="font-graffiti text-[18vw] leading-none text-blood sm:text-[12vw]"
          initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          SEE YOU INSIDE
        </motion.p>
        <a href="#register" className="btn btn-red mt-6">
          Register now
        </a>
        <div className="mt-14 grid gap-6 text-sm text-white/55 sm:grid-cols-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">When</p>
            <p className="mt-1">{EVENT.dateLong}<br />{EVENT.timeLabel}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">Where</p>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block hover:text-white">
              {EVENT.address}
            </a>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">Presented by</p>
            <p className="mt-1">TribeWave Records × Motion Boys Squad</p>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-white/30 sm:flex-row">
          <span>© 2026 Krazy Hours · 18+ · Drink responsibly</span>
          <span className="flex gap-5">
            <Link href="/ticket" className="hover:text-white">My ticket</Link>
            <Link href="/admin" className="hover:text-white">Organisers</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
