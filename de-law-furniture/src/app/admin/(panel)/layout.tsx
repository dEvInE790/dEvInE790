import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const hasDb = !!(await getDb().catch(() => null));
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminNav />
      <main className="flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-5xl">
          {!hasDb && (
            <p className="mb-6 border border-[#a4442e]/30 bg-[#a4442e]/5 p-4 text-sm text-[#7a2f1f]">
              No database is connected here, so changes can&apos;t be saved. The admin area works once the site is deployed to Cloudflare (or with <code>npm run preview</code>).
            </p>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
