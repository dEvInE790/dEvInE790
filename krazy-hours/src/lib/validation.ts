import { z } from "zod";

/** Nigerian numbers: 080..., +234 80..., 234 80... → normalised to +234XXXXXXXXXX */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  // International numbers (non-Nigerian) are accepted as-is in E.164 form
  if (/^\+(?!234)\d{8,15}$/.test(digits)) return digits;
  let d = digits.startsWith("+") ? digits.slice(1) : digits;
  if (d.startsWith("234")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  if (!/^[789][01]\d{8}$/.test(d)) return null;
  return "+234" + d;
}

export const bookingSchema = z.object({
  categoryId: z.uuid({ message: "Choose a ticket category" }),
  quantity: z.coerce.number().int().min(1, "At least 1 ticket").max(50),
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(80)
    .regex(/^[\p{L}][\p{L} .'-]+$/u, "Use letters only"),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const p = normalisePhone(v);
      if (!p) {
        ctx.addIssue({ code: "custom", message: "Enter a valid Nigerian phone number" });
        return z.NEVER;
      }
      return p;
    }),
  email: z.string().trim().toLowerCase().pipe(z.email({ message: "Enter a valid email" }).max(120)),
  paymentReference: z
    .string()
    .trim()
    .min(4, "Enter the transfer reference / session ID")
    .max(64)
    .regex(/^[A-Za-z0-9 _\-/.:]+$/, "Reference has unexpected characters"),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const RECEIPT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

/** Check magic bytes so a renamed file can't pass as an image. */
export function sniffReceipt(buf: Uint8Array): string | null {
  const b = buf;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  const ascii = (s: number, e: number) => String.fromCharCode(...b.slice(s, e));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (["heic", "heix", "hevc", "hevx", "heim", "heis"].includes(brand)) return "image/heic";
    if (["mif1", "msf1"].includes(brand)) return "image/heif";
  }
  return null;
}

/** Map DB errors raised by kh_* functions to customer-friendly messages. */
export function bookingErrorMessage(raw: string): { message: string; status: number } {
  if (raw.includes("BOOKINGS_CLOSED")) return { message: "Bookings are closed right now.", status: 409 };
  if (raw.includes("INVALID_CATEGORY")) return { message: "That ticket category is no longer available.", status: 400 };
  if (raw.includes("INVALID_QUANTITY")) return { message: "That number of tickets isn't allowed.", status: 400 };
  const sold = raw.match(/SOLD_OUT:(\d+)/);
  if (sold) {
    const left = Number(sold[1]);
    return {
      message: left === 0 ? "Sorry — every spot has been taken." : `Only ${left} spot${left === 1 ? "" : "s"} left. Reduce your tickets and try again.`,
      status: 409,
    };
  }
  if (raw.includes("DUPLICATE_CUSTOMER"))
    return {
      message: "There's already an active booking for this email or phone number. Check your ticket status instead.",
      status: 409,
    };
  if (raw.includes("DUPLICATE_REFERENCE") || raw.includes("bookings_live_reference_uniq"))
    return { message: "This payment reference has already been used for a booking.", status: 409 };
  if (raw.includes("DUPLICATE_RECEIPT") || raw.includes("bookings_live_receipt_uniq"))
    return { message: "This receipt has already been submitted for another booking.", status: 409 };
  if (raw.includes("booking_code") || raw.includes("duplicate key"))
    return { message: "Something clashed on our side — please submit again.", status: 409 };
  return { message: "We couldn't save your booking. Please try again.", status: 500 };
}
