import { cn } from "@/lib/utils";

export function Marquee({ items, className }: { items: string[]; className?: string }) {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <li key={i} className="flex items-center">
          <span className="display px-8 text-4xl italic md:text-6xl">{item}</span>
          <span aria-hidden className="h-2 w-2 rotate-45 bg-gold" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className={cn("overflow-hidden py-10", className)}>
      <div className="animate-marquee flex w-max hover:[animation-play-state:paused]">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
