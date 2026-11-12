"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { btn } from "@/components/admin/ui";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (res.ok && data.ok) {
        window.location.href = "/admin";
        return;
      }
      setError(data.message || "Sign in failed.");
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.14em] text-espresso/80">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full border border-espresso/20 px-3 py-3 outline-none focus:border-espresso"
        />
      </div>
      {error && <p role="alert" className="text-sm text-[#a4442e]">{error}</p>}
      <button type="submit" disabled={busy || !password} className={`${btn.primary} w-full`}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
      </button>
    </form>
  );
}
