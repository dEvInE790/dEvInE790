import Link from "next/link";
import { redirect } from "next/navigation";
import { adminPassword, isAdmin } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  const configured = !!adminPassword();
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center text-espresso">
          <Logo />
        </div>
        <div className="border border-espresso/10 bg-white p-7">
          <h1 className="display text-3xl text-espresso">Admin sign in</h1>
          <p className="mt-2 text-sm text-taupe">Manage projects, collections and testimonials.</p>
          {configured ? (
            <LoginForm />
          ) : (
            <p className="mt-6 border border-[#a4442e]/30 bg-[#a4442e]/5 p-4 text-sm text-[#7a2f1f]">
              The admin password hasn&apos;t been set up yet. In Cloudflare, open the <strong>de-law-furniture</strong> Worker → Settings → Variables and
              Secrets, and add a <strong>Secret</strong> named <code>ADMIN_PASSWORD</code> (at least 8 characters).
            </p>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-taupe">
          <Link href="/" className="underline underline-offset-4">Back to website</Link>
        </p>
      </div>
    </main>
  );
}
