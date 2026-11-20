"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginForm({ denied }: { denied: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(denied ? "This account is not an organiser. Ask the event owner to add you." : null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = supabaseBrowser();
    if (denied) await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
      setLoading(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  };

  return (
    <main className="flex min-h-[100svh] items-center justify-center px-4">
      <form onSubmit={submit} className="border-anim w-full max-w-sm rounded-[28px] bg-ink-800 p-7">
        <p className="font-graffiti text-3xl text-blood">KRAZY HOURS</p>
        <h1 className="mt-3 font-display text-3xl uppercase">Organiser login</h1>
        <p className="mt-1 text-sm text-white/50">Restricted area. Activity is logged.</p>
        <div className="mt-6 space-y-3">
          <input className="field" type="email" placeholder="Email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="field" type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="mt-4 rounded-xl bg-[#ff6b61]/10 p-3 text-sm text-[#ffb4ae]" role="alert">{error}</p>}
        <button className="btn btn-red mt-6 w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
