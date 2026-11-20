import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { loadOverview } from "@/lib/admin-data";
import Dashboard from "@/components/admin/Dashboard";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getAdmin();
  if (!admin) {
    // Signed in but not on the admin list → tell them, don't loop.
    const { data } = await (await supabaseServer()).auth.getUser().catch(() => ({ data: { user: null } }));
    redirect(data.user ? "/admin/login?denied=1" : "/admin/login");
  }
  const initial = await loadOverview();
  return <Dashboard initial={JSON.parse(JSON.stringify(initial))} adminEmail={admin.email} />;
}
