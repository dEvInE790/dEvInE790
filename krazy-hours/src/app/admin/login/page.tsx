import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import LoginForm from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  if (await getAdmin()) redirect("/admin");
  const { denied } = await searchParams;
  return <LoginForm denied={!!denied} />;
}
