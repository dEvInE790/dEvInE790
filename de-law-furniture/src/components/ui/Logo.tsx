import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-3 leading-none", className)}>
      <svg aria-hidden viewBox="0 0 40 40" className="h-9 w-9 shrink-0">
        <rect x="1" y="1" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
        <rect x="5" y="5" width="30" height="30" fill="none" stroke="var(--color-gold)" strokeWidth="0.8" />
        <text x="20" y="25.5" textAnchor="middle" fontFamily="var(--font-display), Georgia, serif" fontSize="14" letterSpacing="0.5" fill="currentColor">
          DL
        </text>
      </svg>
      <span className="flex flex-col">
        <span className="display text-[1.35rem] tracking-[0.12em]">DE. LAW</span>
        {!compact && <span className="mt-1 text-[0.55rem] font-semibold tracking-[0.42em] opacity-75">FURNITURE LTD</span>}
      </span>
    </span>
  );
}
