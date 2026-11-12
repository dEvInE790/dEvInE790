import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · DE. LAW Admin" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#f4efe7] text-charcoal">{children}</div>;
}
