import type { ReactNode } from "react";
import { SplitText } from "@/components/motion/SplitText";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow: string;
  title: string[];
  intro?: ReactNode;
  tone?: "light" | "dark";
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2";
};

export function SectionHeading({ eyebrow, title, intro, tone = "light", align = "left", className, as = "h2" }: Props) {
  const dark = tone === "dark";
  return (
    <div className={cn(align === "center" && "mx-auto text-center", "max-w-3xl", className)}>
      <Reveal y={16}>
        <p className={cn("eyebrow mb-6 flex items-center gap-4", align === "center" && "justify-center", dark ? "text-gold" : "text-gold-deep")}>
          <span className="rule" /> {eyebrow}
        </p>
      </Reveal>
      <SplitText as={as} lines={title} className={cn("display text-[2.6rem] xs:text-5xl md:text-6xl lg:text-7xl", dark ? "text-ivory" : "text-espresso")} />
      {intro && (
        <Reveal delay={0.2} className={cn("mt-7 text-base leading-relaxed md:text-lg", dark ? "text-ivory/70" : "text-taupe", align === "center" && "mx-auto max-w-2xl")}>
          {intro}
        </Reveal>
      )}
    </div>
  );
}
