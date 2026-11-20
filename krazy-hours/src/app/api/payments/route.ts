import { createHash, randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { json, sameOrigin } from "@/lib/http";
import { accessSchema, bookingErrorMessage, MAX_RECEIPT_BYTES, paymentReference, RECEIPT_TYPES, sniffReceipt } from "@/lib/validation";
import { getBookingByToken } from "@/lib/access";

export const dynamic = "force-dynamic";

/**
 * Step 2: a registered guest submits their PalmPay transfer proof.
 * The booking becomes PENDING — never confirmed here. An admin must check the
 * money actually arrived before a ticket is issued.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Bad origin" }, 403);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Invalid form submission." }, 400);
  }
  if (String(form.get("website") ?? "").length > 0) return json({ error: "Invalid submission." }, 400);

  const access = accessSchema.safeParse({ code: String(form.get("code") ?? ""), k: String(form.get("k") ?? "") });
  if (!access.success) return json({ error: "Your registration link is invalid. Look it up again." }, 400);
  const ref = paymentReference.safeParse(String(form.get("paymentReference") ?? ""));
  if (!ref.success) return json({ error: ref.error.issues[0].message, fieldErrors: { paymentReference: ref.error.issues[0].message } }, 400);

  const file = form.get("receipt");
  if (!(file instanceof File) || file.size === 0)
    return json({ error: "Upload your payment receipt or screenshot.", fieldErrors: { receipt: "Required" } }, 400);
  if (file.size > MAX_RECEIPT_BYTES) return json({ error: "Receipt must be 5 MB or smaller.", fieldErrors: { receipt: "Max 5 MB" } }, 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffReceipt(bytes);
  if (!mime || !RECEIPT_TYPES[mime])
    return json({ error: "Receipt must be a JPG, PNG, WEBP, HEIC image or a PDF.", fieldErrors: { receipt: "Unsupported file" } }, 400);

  const booking = await getBookingByToken(access.data.code, access.data.k);
  if (!booking) return json({ error: "We couldn't find that registration." }, 404);
  if (booking.status !== "registered") {
    const m = bookingErrorMessage(
      booking.status === "pending" ? "ALREADY_SUBMITTED" : booking.status === "confirmed" ? "ALREADY_CONFIRMED" : "CANCELLED",
    );
    return json({ error: m.message }, m.status);
  }

  const db = supabaseAdmin();
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const path = `${booking.id}/receipt-${randomUUID()}.${RECEIPT_TYPES[mime]}`;
  const upload = await db.storage.from("receipts").upload(path, bytes, { contentType: mime, upsert: false });
  if (upload.error) {
    console.error("receipt upload failed", upload.error.message);
    return json({ error: "We couldn't upload your receipt. Please try again." }, 502);
  }

  const { data, error } = await db.rpc("kh_submit_payment", {
    p_booking_id: booking.id,
    p_payment_reference: ref.data,
    p_receipt_path: path,
    p_receipt_sha256: sha256,
  });
  if (error || !data) {
    await db.storage.from("receipts").remove([path]);
    const m = bookingErrorMessage(error?.message ?? "");
    if (m.status === 500) console.error("submit payment failed", error?.message);
    return json({ error: m.message }, m.status);
  }
  return json({ status: "pending", bookingCode: booking.booking_code, ticketUrl: `/ticket/${booking.booking_code}?k=${booking.access_token}` }, 201);
}
