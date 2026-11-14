"use client";

import { useCallback, useEffect, useState } from "react";

/** Loads data for an admin page and lets it reload after changes. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fn = useCallback(load, deps);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fn());
      setError(null);
    } catch (e) {
      setError((e as { message?: string })?.message || "Couldn't load. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [fn]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload };
}
