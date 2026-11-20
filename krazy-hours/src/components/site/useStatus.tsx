"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { PublicStatus } from "@/lib/event";

type Ctx = { status: PublicStatus | null; error: boolean; refresh: () => Promise<void> };
const StatusContext = createContext<Ctx>({ status: null, error: true, refresh: async () => {} });

/** One shared poller for live remaining spots, prices and bank details. */
export function StatusProvider({ initial, children }: { initial: PublicStatus | null; children: React.ReactNode }) {
  const [status, setStatus] = useState<PublicStatus | null>(initial);
  const [error, setError] = useState(!initial);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/status", { cache: "no-store" });
      if (!r.ok) throw new Error();
      setStatus(await r.json());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => !document.hidden && refresh(), 20000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return <StatusContext.Provider value={{ status, error, refresh }}>{children}</StatusContext.Provider>;
}

export const useStatus = () => useContext(StatusContext);
