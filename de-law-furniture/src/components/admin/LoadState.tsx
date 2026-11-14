"use client";

import { Loader2 } from "lucide-react";

export function LoadState({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  if (error)
    return (
      <div role="alert" className="border border-[#a4442e]/30 bg-[#a4442e]/5 p-4 text-sm text-[#7a2f1f]">
        {error}{" "}
        <button type="button" className="underline underline-offset-4" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  if (loading)
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-taupe">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  return null;
}
