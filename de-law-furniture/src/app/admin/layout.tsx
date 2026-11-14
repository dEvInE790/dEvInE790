import type { Metadata } from "next";
import { supabaseConfig } from "@/lib/supabase-config";
import { deliveryMethod } from "@/lib/mailer";
import { AdminApp } from "@/components/admin/AdminApp";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · DE. LAW Admin" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const cfg = supabaseConfig();
  return (
    <div className="min-h-screen bg-[#f4efe7] text-charcoal">
      {cfg ? (
        <AdminApp url={cfg.url} anonKey={cfg.anonKey} emailConfigured={!!deliveryMethod()}>
          {children}
        </AdminApp>
      ) : (
        <main className="flex min-h-screen items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg">
            <div className="mb-10 flex justify-center text-espresso">
              <Logo />
            </div>
            <div className="border border-espresso/10 bg-white p-7 text-sm leading-relaxed text-taupe">
              <h1 className="display mb-3 text-3xl text-espresso">Connect Supabase</h1>
              <p>The admin area runs on Supabase, which isn&apos;t connected yet. In Cloudflare, open the <strong>de-law-furniture</strong> Worker → Settings → Variables and Secrets, and add:</p>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>
                  <code>SUPABASE_URL</code> — your Project URL (Supabase → Project Settings → API)
                </li>
                <li>
                  <code>SUPABASE_ANON_KEY</code> — the <em>anon / publishable</em> key from the same page
                </li>
              </ul>
              <p className="mt-3">Then run the setup SQL — see the README&apos;s “Admin area (Supabase)” section.</p>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
