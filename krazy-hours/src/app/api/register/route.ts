import { supabaseAdmin } from "@/lib/supabase/admin";
import { json, sameOrigin } from "@/lib/http";
import { bookingErrorMessage, registerSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Step 1: register (reserves one of the limited spots; no payment yet). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Bad origin" }, 403);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "Invalid request." }, 400);
  if (String((body as Record<string, unknown>).website ?? "").length > 0) return json({ error: "Invalid submission." }, 400);

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return json({ error: "Please fix the highlighted fields.", fieldErrors }, 400);
  }
  const { categoryId, fullName, phone, email } = parsed.data;

  const { data, error } = await supabaseAdmin().rpc("kh_register", {
    p_category_id: categoryId,
    p_full_name: fullName,
    p_phone: phone,
    p_email: email,
  });
  if (error || !data) {
    const m = bookingErrorMessage(error?.message ?? "");
    if (m.status === 500) console.error("register failed", error?.message);
    return json({ error: m.message }, m.status);
  }
  const b = data as { booking_code: string; access_token: string; amount: number; category_name: string; status: string };
  return json(
    {
      bookingCode: b.booking_code,
      k: b.access_token,
      ticketUrl: `/ticket/${b.booking_code}?k=${b.access_token}`,
      amount: b.amount,
      category: b.category_name,
      fullName,
      status: b.status,
    },
    201,
  );
}
