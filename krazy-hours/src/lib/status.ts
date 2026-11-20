import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PublicStatus } from "@/lib/event";

export async function getPublicStatus(): Promise<PublicStatus | null> {
  try {
    const { data, error } = await supabaseAdmin().rpc("kh_public_status");
    if (error || !data) {
      console.error("kh_public_status failed:", error?.message ?? "no data");
      return null;
    }
    return data as PublicStatus;
  } catch (e) {
    console.error("kh_public_status threw:", (e as Error).message);
    return null;
  }
}
