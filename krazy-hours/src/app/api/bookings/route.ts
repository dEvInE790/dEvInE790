import { createHash, randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { json, sameOrigin } from "@/lib/http";
import {
  bookingSchema,
  bookingErrorMessage,
  MAX_RECEIPT_BYTES,
  RECEIPT_TYPES,
  sniffReceipt,
} from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Creates a PENDING booking. Payment is never marked as verified here —
 * an administrator must check the receipt against the PalmPay account.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Bad origin" }, 403);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Invalid form submission." }, 400);
  }

  // Honeypot: real users never fill this hidden field.
  if (String(form.get("website") ?? "").length > 0) return json({ error: "Invalid submission." }, 400);

  const parsed = bookingSchema.safeParse({
    categoryId: form.get("categoryId"),
    quantity: form.get("quantity"),
    fullName: form.get("fullName"),
    phone: form.get("phone"),
    email: form.get("email"),
    paymentReference: form.get("paymentReference"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return json({ error: "Please fix the highlighted fields.", fieldErrors }, 400);
  }
  const input = parsed.data;

  const file = form.get("receipt");
  if (!(file instanceof File) || file.size === 0) {
    return json({ error: "Upload your payment receipt or screenshot.", fieldErrors: { receipt: "Required" } }, 400);
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    return json({ error: "Receipt must be 5 MB or smaller.", fieldErrors: { receipt: "Max 5 MB" } }, 400);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffReceipt(bytes);
  if (!mime || !RECEIPT_TYPES[mime]) {
    return json(
      { error: "Receipt must be a JPG, PNG, WEBP, HEIC image or a PDF.", fieldErrors: { receipt: "Unsupported file" } },
      400,
    );
  }

  const db = supabaseAdmin();
  const bookingId = randomUUID();
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const path = `${bookingId}/receipt-${Date.now()}.${RECEIPT_TYPES[mime]}`;

  const upload = await db.storage.from("receipts").upload(path, bytes, { contentType: mime, upsert: false });
  if (upload.error) {
    console.error("receipt upload failed", upload.error.message);
    return json({ error: "We couldn't upload your receipt. Please try again." }, 502);
  }

  const { data, error } = await db.rpc("kh_create_booking", {
    p_id: bookingId,
    p_category_id: input.categoryId,
    p_quantity: input.quantity,
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_email: input.email,
    p_payment_reference: input.paymentReference,
    p_receipt_path: path,
    p_receipt_sha256: sha256,
  });

  if (error || !data) {
    // Booking was refused — don't keep an orphaned receipt.
    await db.storage.from("receipts").remove([path]);
    const { message, status } = bookingErrorMessage(error?.message ?? "");
    if (status === 500) console.error("create booking failed", error?.message);
    return json({ error: message }, status);
  }

  const b = data as {
    id: string;
    booking_code: string;
    access_token: string;
    amount: number;
    quantity: number;
    category_name: string;
    status: string;
  };
  return json(
    {
      bookingCode: b.booking_code,
      ticketUrl: `/ticket/${b.booking_code}?k=${b.access_token}`,
      amount: b.amount,
      quantity: b.quantity,
      category: b.category_name,
      status: b.status,
    },
    201,
  );
}
