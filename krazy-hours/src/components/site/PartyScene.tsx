"use client";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useMemo } from "react";
import Embers from "./Embers";
import { MEDIA } from "@/lib/media";

/* Deterministic pseudo-random so server and client render the same crowd. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type Person = {
  x: number;
  scale: number;
  armL: "up" | "down" | "phone" | "cup";
  armR: "up" | "down" | "phone" | "cup";
  bob: number;
  delay: number;
  hair: number;
  lean: number;
};

function makeCrowd(seed: number, count: number, spread: number): Person[] {
  const r = rng(seed);
  const poses: Person["armL"][] = ["up", "up", "down", "phone", "cup", "up"];
  return Array.from({ length: count }, (_, i) => ({
    x: (i + 0.5) * (spread / count) + (r() - 0.5) * 40,
    scale: 0.85 + r() * 0.35,
    armL: poses[Math.floor(r() * poses.length)],
    armR: poses[Math.floor(r() * poses.length)],
    bob: 0.9 + r() * 0.6,
    delay: -r() * 2,
    hair: Math.floor(r() * 4),
    lean: (r() - 0.5) * 8,
  }));
}

function Arm({ side, pose, dur, delay }: { side: -1 | 1; pose: Person["armL"]; dur: number; delay: number }) {
  const sx = side * 34;
  if (pose === "down") {
    return <rect x={sx - 7 + side * 4} y={-92} width={14} height={86} rx={7} transform={`rotate(${side * 6} ${sx} -92)`} />;
  }
  const anim = side === -1 ? "wave-l" : "wave-r";
  const len = pose === "up" ? 118 : 92;
  return (
    <g
      style={{
        transformBox: "fill-box",
        transformOrigin: "50% 100%",
        animation: `${anim} ${dur}s ease-in-out ${delay}s infinite`,
      }}
    >
      <g transform={`translate(${sx} -96) rotate(${side * (pose === "up" ? 14 : 38)})`}>
        <rect x={-7} y={-len} width={14} height={len + 6} rx={7} />
        <circle cx={0} cy={-len} r={9} />
        {pose === "phone" && (
          <>
            <rect x={-9} y={-len - 30} width={18} height={30} rx={3} />
            <rect x={-7} y={-len - 28} width={14} height={24} rx={2} fill="#ffd9d6" opacity={0.95} />
            <circle cx={0} cy={-len - 16} r={22} fill="url(#phoneGlow)" />
          </>
        )}
        {pose === "cup" && <path d={`M-11 ${-len - 26} h22 l-4 26 h-14 z`} fill="#c10500" />}
      </g>
    </g>
  );
}

function Silhouette({ p, fill }: { p: Person; fill: string }) {
  const dur = p.bob;
  return (
    <g transform={`translate(${p.x} 600) scale(${p.scale})`} fill={fill}>
      <g style={{ animation: `bob ${dur}s ease-in-out ${p.delay}s infinite` }}>
        <g transform={`rotate(${p.lean})`}>
          <Arm side={-1} pose={p.armL} dur={dur * 2} delay={p.delay} />
          <Arm side={1} pose={p.armR} dur={dur * 2} delay={p.delay - 0.3} />
          {/* torso + shoulders */}
          <path d="M-46 0 C-50 -60 -48 -88 -30 -100 C-14 -110 14 -110 30 -100 C48 -88 50 -60 46 0 Z" />
          {/* neck + head */}
          <rect x={-9} y={-124} width={18} height={26} rx={6} />
          <ellipse cx={0} cy={-142} rx={22} ry={25} />
          {p.hair === 1 && <ellipse cx={0} cy={-162} rx={26} ry={14} />}
          {p.hair === 2 && (
            <>
              <circle cx={-14} cy={-160} r={12} />
              <circle cx={14} cy={-160} r={12} />
              <circle cx={0} cy={-168} r={13} />
            </>
          )}
          {p.hair === 3 && <path d="M-24 -150 Q0 -190 24 -150 L28 -100 L-28 -100 Z" />}
        </g>
      </g>
    </g>
  );
}

function Crowd({ seed, count, fill, className, glow }: { seed: number; count: number; fill: string; className?: string; glow?: boolean }) {
  const people = useMemo(() => makeCrowd(seed, count, 1600), [seed, count]);
  return (
    <svg
      viewBox="0 0 1600 600"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      style={glow ? { filter: "drop-shadow(0 -2px 10px rgba(225,6,0,.45))" } : undefined}
      aria-hidden
    >
      <defs>
        <radialGradient id="phoneGlow">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {people.map((p, i) => (
        <Silhouette key={i} p={p} fill={fill} />
      ))}
    </svg>
  );
}

function useLayer(mx: MotionValue<number>, my: MotionValue<number>, depth: number) {
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth * 0.6);
  return { x, y };
}

/**
 * The hero's animated apartment-party scene, built from layered vector art so it
 * loads instantly on mobile data. Drop a real photo in /public/media and set
 * MEDIA.heroImage to layer it underneath.
 */
export default function PartyScene({ scrollY }: { scrollY: MotionValue<number> }) {
  const mxRaw = useMotionValue(0);
  const myRaw = useMotionValue(0);
  const mx = useSpring(mxRaw, { stiffness: 60, damping: 20 });
  const my = useSpring(myRaw, { stiffness: 60, damping: 20 });

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    const onMove = (e: PointerEvent) => {
      mxRaw.set((e.clientX / window.innerWidth - 0.5) * 2);
      myRaw.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mxRaw, myRaw]);

  const far = useLayer(mx, my, -8);
  const mid = useLayer(mx, my, -18);
  const near = useLayer(mx, my, -32);

  const bgScale = useTransform(scrollY, [0, 1], [1.05, 1.25]);
  const backY = useTransform(scrollY, [0, 1], ["0%", "18%"]);
  const frontY = useTransform(scrollY, [0, 1], ["0%", "6%"]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-ink" aria-hidden>
      {/* Room: back wall lit from a red ceiling lamp */}
      <motion.div className="absolute inset-0" style={{ scale: bgScale, x: far.x, y: far.y }}>
        {MEDIA.heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={MEDIA.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-luminosity" />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,#8a0a04_0%,#3a0201_35%,#0a0000_65%,#050505_100%)]" />
        {/* venetian-blind light across the wall */}
        <div
          className="absolute left-1/2 top-[6%] h-[60%] w-[120%] -translate-x-1/2 -skew-x-12 opacity-40"
          style={{
            background: "repeating-linear-gradient(180deg, rgba(255,60,40,.55) 0 10px, transparent 10px 26px)",
            maskImage: "radial-gradient(ellipse 45% 60% at 60% 40%, #000 0%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 45% 60% at 60% 40%, #000 0%, transparent 75%)",
          }}
        />
        {/* window frame on the left wall */}
        <div className="absolute left-[4%] top-[14%] hidden h-[38%] w-[16%] border border-white/[0.06] bg-[linear-gradient(180deg,#0a0507,#140305)] opacity-70 md:block">
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.07]" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/[0.07]" />
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-amber-200/60"
              style={{ left: `${(i * 37) % 95}%`, top: `${55 + ((i * 23) % 40)}%`, animation: `flicker ${3 + (i % 4)}s linear ${i * 0.3}s infinite` }}
            />
          ))}
        </div>
      </motion.div>

      {/* mirror ball */}
      <motion.div className="absolute right-[9%] top-0 sm:right-[14%]" style={{ x: mid.x }}>
        <div className="mx-auto h-[12vh] w-px bg-white/20" />
        <div
          className="h-10 w-10 rounded-full opacity-80 shadow-[0_0_40px_rgba(255,60,40,.6)] sm:h-16 sm:w-16"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #fff 0 6%, transparent 7%), repeating-conic-gradient(from 0deg, #3b0a08 0 10deg, #b3261e 10deg 20deg), #2a0504",
            animation: "spin-slow 9s linear infinite",
          }}
        />
      </motion.div>

      {/* sweeping light beams */}
      {[
        { left: "18%", dur: 7, delay: 0, w: "22vw" },
        { left: "50%", dur: 9, delay: -3, w: "28vw" },
        { left: "80%", dur: 8, delay: -5, w: "22vw" },
      ].map((b, i) => (
        <div
          key={i}
          className="absolute top-[-10%] h-[120%] origin-top mix-blend-screen"
          style={{
            left: b.left,
            width: b.w,
            marginLeft: `calc(${b.w} / -2)`,
            background: "linear-gradient(180deg, rgba(255,40,20,.55), rgba(225,6,0,.12) 55%, transparent 85%)",
            clipPath: "polygon(46% 0, 54% 0, 100% 100%, 0 100%)",
            filter: "blur(6px)",
            animation: `beam ${b.dur}s ease-in-out ${b.delay}s infinite`,
            opacity: 0.55,
          }}
        />
      ))}

      {/* smoke */}
      <div className="absolute inset-0 opacity-70">
        <div className="absolute bottom-[10%] left-[-20%] h-[55%] w-[80%] rounded-full bg-[radial-gradient(closest-side,rgba(200,40,30,.28),transparent)] blur-2xl" style={{ animation: "drift 22s ease-in-out infinite" }} />
        <div className="absolute bottom-[20%] right-[-25%] h-[50%] w-[75%] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,.08),transparent)] blur-2xl" style={{ animation: "drift 28s ease-in-out -8s infinite reverse" }} />
        <div className="absolute bottom-0 left-[10%] h-[40%] w-[90%] rounded-full bg-[radial-gradient(closest-side,rgba(120,10,8,.35),transparent)] blur-3xl" style={{ animation: "drift 30s ease-in-out -14s infinite" }} />
      </div>

      {/* stage backlight behind the crowd so the silhouettes read */}
      <div className="absolute inset-x-0 bottom-0 h-[70%] bg-[radial-gradient(ellipse_65%_60%_at_50%_100%,rgba(255,45,20,.85)_0%,rgba(200,10,0,.45)_35%,transparent_75%)]" />
      <div className="absolute inset-x-0 bottom-[8%] h-[30%] bg-[radial-gradient(ellipse_40%_50%_at_30%_100%,rgba(255,120,80,.35),transparent_70%),radial-gradient(ellipse_40%_50%_at_75%_100%,rgba(255,60,30,.35),transparent_70%)]" />

      <Embers />

      {/* crowd — back row (red-lit, far) */}
      <motion.div className="absolute inset-x-[-5%] bottom-[9%] h-[40%] sm:h-[50%]" style={{ y: backY, x: mid.x }}>
        <Crowd seed={7} count={13} fill="#3a0605" className="h-full w-full" />
      </motion.div>
      {/* crowd — front row (pure black, close) */}
      <motion.div className="absolute inset-x-[-8%] bottom-[-2%] h-[36%] sm:h-[44%]" style={{ y: frontY, x: near.x }}>
        <Crowd seed={31} count={9} fill="#030303" className="h-full w-full" glow />
      </motion.div>

      {/* soft strobe + vignette */}
      <div className="animate-strobe absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,80,60,.45),transparent_60%)] mix-blend-screen" />
      <div className="vignette absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink to-transparent" />
    </div>
  );
}
