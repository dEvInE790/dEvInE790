import type { Metadata } from "next";
import { supabaseConfig, supabaseStatus, type VarStatus } from "@/lib/supabase-config";
import { deliveryMethod } from "@/lib/mailer";
import { AdminApp } from "@/components/admin/AdminApp";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · DE. LAW Admin" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const statusText: Record<VarStatus, { label: string; cls: string }> = {
  ok: { label: "✓ found", cls: "text-[#1f5c3d]" },
  missing: { label: "✗ not found — check the name is spelled exactly like this", cls: "text-[#a4442e]" },
  invalid: { label: "✗ found, but the value doesn't look right", cls: "text-[#a4442e]" },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const cfg = supabaseConfig();
  const status = cfg ? null : supabaseStatus();
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
              <ul className="mt-4 space-y-3">
                <li>
                  <code className="font-semibold text-espresso">SUPABASE_URL</code> — your Project URL, e.g. <code>https://abcdefgh.supabase.co</code>
                  <br />
                  <span className={statusText[status!.url].cls}>{statusText[status!.url].label}</span>
                </li>
                <li>
                  <code className="font-semibold text-espresso">SUPABASE_ANON_KEY</code> — the <em>anon / publishable</em> key (Supabase → Project Settings → API Keys)
                  <br />
                  {status!.keyLooksSecret ? (
                    <span className="text-[#a4442e]">✗ this is the SECRET (service_role) key — never use it here. Replace it with the anon / publishable key.</span>
                  ) : (
                    <span className={statusText[status!.key].cls}>{statusText[status!.key].label}</span>
                  )}
                </li>
              </ul>
              <p className="mt-4">
                After adding or fixing a variable, click <strong>Deploy</strong> in Cloudflare, wait a few seconds and refresh this page.
              </p>
              <p className="mt-3">Then run the setup SQL — see the README&apos;s “Admin area (Supabase)” section.</p>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
