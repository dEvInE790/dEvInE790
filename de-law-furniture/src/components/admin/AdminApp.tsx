"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { makeAdminApi, type AdminApi } from "@/lib/admin-api";
import { Logo } from "@/components/ui/Logo";
import { AdminNav } from "./AdminNav";
import { btn } from "./styles";

type Ctx = { sb: SupabaseClient; api: AdminApi; user: User; emailConfigured: boolean; signOut: () => Promise<void> };
const AdminContext = createContext<Ctx | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminApp>");
  return ctx;
}

type Status = "loading" | "signed-out" | "not-admin" | "ready";

/** Supabase-powered admin: sign-in, admin check, then the admin shell. */
export function AdminApp({ url, anonKey, emailConfigured, children }: { url: string; anonKey: string; emailConfigured: boolean; children: ReactNode }) {
  const sb = useMemo(() => createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "dl-admin-auth" } }), [url, anonKey]);
  const api = useMemo(() => makeAdminApi(sb), [sb]);
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);

  const evaluate = useCallback(
    async (u: User | null) => {
      setUser(u);
      if (!u) return setStatus("signed-out");
      const { data, error } = await sb.rpc("is_admin");
      setStatus(!error && data === true ? "ready" : "not-admin");
    },
    [sb]
  );

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => evaluate(data.session?.user ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") evaluate(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [sb, evaluate]);

  const signOut = useCallback(async () => {
    await sb.auth.signOut();
    setStatus("signed-out");
  }, [sb]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-taupe">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
      </div>
    );
  }
  if (status === "signed-out") return <SignIn sb={sb} />;
  if (status === "not-admin") {
    return (
      <Centered>
        <h1 className="display text-3xl text-espresso">No admin access</h1>
        <p className="mt-3 text-sm text-taupe">
          You&apos;re signed in as <strong className="text-espresso">{user?.email}</strong>, but this account isn&apos;t on the admin list. Ask the website owner to add
          it (see the setup guide), then sign in again.
        </p>
        <button type="button" className={`${btn.secondary} mt-6 w-full`} onClick={signOut}>
          Sign out
        </button>
      </Centered>
    );
  }
  return (
    <AdminContext.Provider value={{ sb, api, user: user!, emailConfigured, signOut }}>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <AdminNav email={user?.email ?? ""} onSignOut={signOut} />
        <main className="flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </AdminContext.Provider>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center text-espresso">
          <Logo />
        </div>
        <div className="border border-espresso/10 bg-white p-7">{children}</div>
        <p className="mt-6 text-center text-xs text-taupe">
          <Link href="/" className="underline underline-offset-4">
            Back to website
          </Link>
        </p>
      </div>
    </main>
  );
}

function SignIn({ sb }: { sb: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(/invalid/i.test(error.message) ? "Email or password is not correct." : error.message);
    setBusy(false);
  };

  const reset = async () => {
    if (!email.trim()) return setError("Type your email address first, then click “Forgot password?”.");
    setError(null);
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/admin` });
    if (error) setError(error.message);
    else setResetSent(true);
  };

  return (
    <Centered>
      <h1 className="display text-3xl text-espresso">Admin sign in</h1>
      <p className="mt-2 text-sm text-taupe">Manage projects, collections and testimonials.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {(
          [
            ["email", "Email", "email", email, setEmail, "username"],
            ["password", "Password", "password", password, setPassword, "current-password"],
          ] as const
        ).map(([id, label, type, value, set, ac]) => (
          <div key={id}>
            <label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.14em] text-espresso/80">
              {label}
            </label>
            <input
              id={id}
              type={type}
              autoComplete={ac}
              required
              value={value}
              onChange={(e) => set(e.target.value)}
              className="mt-1.5 w-full border border-espresso/20 px-3 py-3 outline-none focus:border-espresso"
            />
          </div>
        ))}
        {error && (
          <p role="alert" className="text-sm text-[#a4442e]">
            {error}
          </p>
        )}
        {resetSent && <p className="text-sm text-[#1f5c3d]">If that email has an account, a password-reset link is on its way.</p>}
        <button type="submit" disabled={busy || !email || !password} className={`${btn.primary} w-full`}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
        </button>
        <button type="button" onClick={reset} className="w-full text-center text-xs text-taupe underline underline-offset-4 hover:text-espresso">
          Forgot password?
        </button>
      </form>
    </Centered>
  );
}
