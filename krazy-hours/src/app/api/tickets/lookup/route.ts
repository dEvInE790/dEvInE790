import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { json, sameOrigin } from "@/lib/http";
import { normalisePhone } from "@/lib/validation";

export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().trim().toUpperCase().regex(/^KH-[A-Z0-9]{6}$/, "Booking ID looks like KH-XXXXXX"),
  contact: z.string().trim().min(5).max(120),
});

/** Booking ID + the email or phone used to register → private link (code + token). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Bad origin" }, 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);

  const { code, contact } = parsed.data;
  const { data } = await supabaseAdmin()
    .from("bookings")
    .select("booking_code, access_token, email, phone")
    .eq("booking_code", code)
    .maybeSingle();

  const matches = data && (data.email === contact.toLowerCase() || (normalisePhone(contact) ?? "__") === data.phone);
  // Same response for "no such booking" and "wrong contact" so IDs can't be probed.
  if (!matches) return json({ error: "We couldn't find a registration with those details." }, 404);
  return json({ code: data.booking_code, k: data.access_token, ticketUrl: `/ticket/${data.booking_code}?k=${data.access_token}` });
}
