"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { mapsDirectionsUrl, mapsEmbedUrl, site } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Google Maps embed, loaded only when it nears the viewport to keep pages fast. */
export function MapEmbed({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("relative overflow-hidden bg-cream", className)}>
      {load ? (
        <iframe
          title={`Map showing ${site.name}, ${site.address.full}`}
          src={mapsEmbedUrl}
          className="absolute inset-0 h-full w-full border-0 grayscale-[0.6] sepia-[0.2]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-taupe">
          <MapPin className="h-6 w-6" aria-hidden />
        </div>
      )}
      <a
        href={mapsDirectionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 left-4 bg-espresso px-5 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-ivory shadow-lg transition-colors hover:bg-gold-deep"
      >
        Open in Google Maps
      </a>
    </div>
  );
}
