import type { Metadata } from "next";

export const metadata: Metadata = { title: "Organisers — KRAZY HOURS", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100svh] bg-ink">{children}</div>;
}
