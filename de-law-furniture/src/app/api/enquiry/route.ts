import { NextResponse } from "next/server";
import { ACCEPTED_IMAGE_TYPES, LIMITS, enquiryRows, enquiryToText, validateEnquiry, type EnquiryFields } from "@/lib/enquiry";
import { deliveryMethod, sendMail, type Attachment } from "@/lib/mailer";
import { site } from "@/lib/site";
import { getCatalogue } from "@/lib/content";
import { buildQuoteCategories } from "@/lib/quote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Best-effort per-instance rate limit: 5 submissions per IP every 10 minutes.
const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 5;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Confirms the file content really is a JPEG, PNG or WebP image (not just its declared type). */
function sniffImage(buf: Buffer): string | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "";
};

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, code: "BAD_REQUEST", message: "The form could not be read. Please try again." }, { status: 400 });
  }

  // Honeypot: real visitors never fill this hidden field.
  if (str(fd, "company_website")) return NextResponse.json({ ok: true, reference: "DL-RECEIVED" });

  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED", message: "Too many submissions in a short time. Please wait a few minutes, or contact us on WhatsApp." },
      { status: 429 }
    );
  }

  const type = str(fd, "type") === "contact" ? "contact" : "quote";
  const fields: EnquiryFields = {
    type,
    name: str(fd, "name"),
    phone: str(fd, "phone"),
    email: str(fd, "email"),
    category: str(fd, "category"),
    product: str(fd, "product"),
    description: str(fd, "description"),
    materials: str(fd, "materials"),
    dimensions: str(fd, "dimensions"),
    location: str(fd, "location"),
    budget: str(fd, "budget"),
  };

  const allowed = type === "quote" ? buildQuoteCategories((await getCatalogue()).map((c) => c.name)) : undefined;
  const errors = validateEnquiry(fields, allowed);

  // Reference photographs (quote requests only)
  const attachments: Attachment[] = [];
  if (type === "quote") {
    const files = fd.getAll("photos").filter((f): f is File => typeof f !== "string" && f.size > 0);
    const total = files.reduce((n, f) => n + f.size, 0);
    if (files.length > LIMITS.maxPhotos) errors.photos = `Please attach up to ${LIMITS.maxPhotos} photographs.`;
    else if (total > LIMITS.maxTotalPhotoBytes) errors.photos = "The photographs are too large. Please attach smaller images.";
    else {
      for (const [i, file] of files.entries()) {
        const buf = Buffer.from(await file.arrayBuffer());
        const kind = sniffImage(buf);
        if (!kind || !ACCEPTED_IMAGE_TYPES.includes(kind)) {
          errors.photos = "Photographs must be JPEG, PNG or WebP images.";
          break;
        }
        const ext = kind.split("/")[1].replace("jpeg", "jpg");
        attachments.push({ filename: `reference-${i + 1}.${ext}`, content: buf, contentType: kind });
      }
    }
  }

  if (Object.keys(errors).length) {
    return NextResponse.json({ ok: false, code: "INVALID", errors, message: "Please check the highlighted fields." }, { status: 422 });
  }

  if (!deliveryMethod()) {
    console.warn("[enquiry] Delivery is not configured — set ENQUIRY_TO_EMAIL and SMTP_* or RESEND_* environment variables.");
    return NextResponse.json(
      { ok: false, code: "NOT_CONFIGURED", message: "Online enquiries are not available at the moment. Your enquiry has not been sent." },
      { status: 503 }
    );
  }

  const reference = `DL-${Date.now().toString(36).toUpperCase()}`;
  const label = type === "quote" ? "Quotation request" : "Website enquiry";
  const subject = `${label}${fields.category ? ` — ${fields.category}` : ""} — ${fields.name} [${reference}]`.replace(/[\r\n]+/g, " ");
  const summary = enquiryToText(fields);
  const text = `${label} received via the ${site.name} website.\nReference: ${reference}\n\n${summary}${type === "quote" ? `\n\nReference photographs attached: ${attachments.length}` : ""}\n\nReply to the customer by phone or WhatsApp: https://wa.me/${fields.phone.replace(/\D/g, "").replace(/^0/, "234")}`;
  const rowsHtml = enquiryRows(fields)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 16px 10px 0;color:#6f6358;vertical-align:top;white-space:nowrap;font-size:13px">${escapeHtml(k)}</td><td style="padding:10px 0;color:#1d1c1a;font-size:15px;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`
    )
    .join("");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#f8f4ed">
  <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#85683f;margin:0 0 8px">${escapeHtml(site.name)}</p>
  <h1 style="font-family:Georgia,serif;font-weight:normal;color:#2a1d15;margin:0 0 4px">${escapeHtml(label)}</h1>
  <p style="color:#6f6358;margin:0 0 24px;font-size:13px">Reference ${reference}</p>
  <table style="border-collapse:collapse;width:100%;border-top:1px solid #ddd0bc">${rowsHtml}</table>
  ${type === "quote" ? `<p style="color:#6f6358;font-size:13px;margin-top:24px">Reference photographs attached: ${attachments.length}</p>` : ""}
</div>`;

  try {
    await sendMail({ subject, text, html, replyTo: fields.email || undefined, attachments });
  } catch (err) {
    console.error("[enquiry] Delivery failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, code: "DELIVERY_FAILED", message: "We couldn't send your enquiry just now. It has not been delivered — please try again or contact us on WhatsApp." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, reference });
}
