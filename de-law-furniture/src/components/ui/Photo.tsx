"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

type PhotoProps = Omit<ImageProps, "src" | "alt"> & {
  src: string;
  alt: string;
  /** Accepted for call-site readability; the fallback panel uses `alt` for its accessible name. */
  label?: string;
};

/**
 * next/image wrapper. If a photograph fails to load (e.g. a temporary image
 * is removed), a styled placeholder panel is shown instead of a broken image.
 */
export function Photo({ src, alt, label: _label, className, ...rest }: PhotoProps) {
  void _label;
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-cream via-sand to-[#c9b89e]",
          className
        )}
      >
        <svg aria-hidden viewBox="0 0 100 100" className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-espresso/15">
          <rect x="6" y="6" width="88" height="88" fill="none" stroke="currentColor" strokeWidth="2" />
          <text x="50" y="62" textAnchor="middle" fontFamily="Georgia, serif" fontSize="34" fill="currentColor">DL</text>
        </svg>
      </div>
    );
  }

  return <Image src={src} alt={alt} className={className} onError={() => setFailed(true)} {...rest} />;
}
