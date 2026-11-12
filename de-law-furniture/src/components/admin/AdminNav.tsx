"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Images, LayoutDashboard, LogOut, Menu, MessageSquareQuote, Sofa, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/projects", label: "Projects", icon: Images },
  { href: "/admin/collections", label: "Collections", icon: Sofa },
  { href: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote },
];

export function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/admin/login";
  };

  return (
    <aside className="bg-espresso text-ivory lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-col">
      <div className="flex items-center justify-between px-5 py-4 lg:py-7">
        <Link href="/admin" className="text-ivory">
          <Logo />
        </Link>
        <button type="button" className="flex h-11 w-11 items-center justify-center lg:hidden" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      <nav className={cn("flex-1 flex-col gap-1 px-3 pb-4 lg:flex", open ? "flex" : "hidden")} aria-label="Admin">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            aria-current={active(l.href, l.exact) ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-3 text-sm transition-colors",
              active(l.href, l.exact) ? "bg-ivory/10 text-gold-light" : "text-ivory/75 hover:bg-ivory/5 hover:text-ivory"
            )}
          >
            <l.icon className="h-4 w-4" strokeWidth={1.6} /> {l.label}
          </Link>
        ))}
        <div className="mt-auto space-y-1 border-t border-ivory/10 pt-4">
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-3 text-sm text-ivory/75 hover:text-ivory">
            <ExternalLink className="h-4 w-4" strokeWidth={1.6} /> View website
          </a>
          <button type="button" onClick={logout} className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm text-ivory/75 hover:text-ivory">
            <LogOut className="h-4 w-4" strokeWidth={1.6} /> Sign out
          </button>
        </div>
      </nav>
    </aside>
  );
}
