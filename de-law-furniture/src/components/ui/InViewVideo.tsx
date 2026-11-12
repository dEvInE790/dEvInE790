"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Short silent preview for project videos. It only downloads and plays while
 * on screen, pauses when scrolled away, and does not autoplay for visitors
 * who prefer reduced motion (they see the poster and a play badge instead).
 */
export function InViewVideo({ src, poster, label, className, showBadge = true }: { src: string; poster: string; label: string; className?: string; showBadge?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        } else {
          v.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.35 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <video
        ref={ref}
        src={src}
        poster={poster}
        aria-label={label}
        muted
        loop
        playsInline
        preload="none"
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
      />
      {showBadge && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-4 top-4 flex items-center gap-2 bg-espresso/70 px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ivory backdrop-blur-sm transition-opacity duration-500"
          )}
        >
          <Play className="h-3 w-3 fill-current" /> {playing ? "Playing" : "Video"}
        </span>
      )}
    </>
  );
}
