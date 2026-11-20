import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PublicStatus } from "@/lib/event";

export async function getPublicStatus(): Promise<PublicStatus | null> {
  try {
    const { data, error } = await supabaseAdmin().rpc("kh_public_status");
    if (error || !data) return null;
    return data as PublicStatus;
  } catch {
    return null;
  }
}
