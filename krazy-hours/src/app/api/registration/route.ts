import { json } from "@/lib/http";
import { accessSchema } from "@/lib/validation";
import { getBookingByToken, guestSummary } from "@/lib/access";

export const dynamic = "force-dynamic";

/** A guest's own registration status (needs their secret link token). */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const parsed = accessSchema.safeParse({ code: sp.get("code") ?? "", k: sp.get("k") ?? "" });
  if (!parsed.success) return json({ error: "Invalid link" }, 400);
  const b = await getBookingByToken(parsed.data.code, parsed.data.k);
  if (!b) return json({ error: "We couldn't find that registration." }, 404);
  return json(guestSummary(b));
}
