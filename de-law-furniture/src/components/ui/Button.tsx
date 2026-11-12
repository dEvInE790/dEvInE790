import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "solid" | "gold" | "light" | "outline-light" | "outline-dark";

const variants: Record<Variant, string> = {
  solid: "bg-espresso text-ivory before:bg-gold-deep",
  gold: "bg-gold text-espresso before:bg-ivory",
  light: "bg-ivory text-espresso before:bg-gold-light",
  "outline-light": "border border-ivory/50 text-ivory before:bg-ivory hover:text-espresso focus-visible:text-espresso",
  "outline-dark": "border border-espresso/30 text-espresso before:bg-espresso hover:text-ivory focus-visible:text-ivory",
};

export const buttonClass = (variant: Variant = "solid", className?: string) =>
  cn(
    "group relative isolate inline-flex min-h-12 items-center justify-center gap-3 overflow-hidden px-7 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] transition-colors duration-500",
    "before:absolute before:inset-0 before:-z-10 before:origin-bottom before:scale-y-0 before:transition-transform before:duration-500 before:ease-[cubic-bezier(0.22,1,0.36,1)] hover:before:scale-y-100 focus-visible:before:scale-y-100",
    variants[variant],
    className
  );

type Props = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
  icon?: ReactNode | false;
  external?: boolean;
} & Omit<ComponentProps<"a">, "href" | "className" | "children">;

/** Link styled as a button. External links (WhatsApp, tel:) open appropriately. */
export function ButtonLink({ href, children, variant = "solid", className, icon, external, ...rest }: Props) {
  const isExternal = external ?? /^(https?:|tel:|mailto:)/.test(href);
  const iconEl =
    icon === false ? null : (
      <span className="relative inline-flex h-4 w-4 overflow-hidden" aria-hidden>
        {icon ?? (
          <>
            <ArrowUpRight className="h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-full group-hover:translate-x-full" strokeWidth={1.5} />
            <ArrowUpRight className="absolute inset-0 h-4 w-4 -translate-x-full translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0 group-hover:translate-y-0" strokeWidth={1.5} />
          </>
        )}
      </span>
    );

  if (isExternal) {
    const newTab = href.startsWith("http");
    return (
      <a href={href} className={buttonClass(variant, className)} {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>
        <span>{children}</span>
        {iconEl}
      </a>
    );
  }
  return (
    <Link href={href} className={buttonClass(variant, className)} {...rest}>
      <span>{children}</span>
      {iconEl}
    </Link>
  );
}
