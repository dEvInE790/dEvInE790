import "server-only";

export type Attachment = { filename: string; content: Buffer; contentType: string };
export type Mail = { subject: string; text: string; html: string; replyTo?: string; attachments: Attachment[] };

export type DeliveryMethod = "resend" | "smtp" | null;

const env = (k: string) => process.env[k]?.trim() || "";

export function deliveryMethod(): DeliveryMethod {
  if (!env("ENQUIRY_TO_EMAIL")) return null;
  if (env("RESEND_API_KEY") && env("RESEND_FROM")) return "resend";
  if (env("SMTP_HOST") && env("SMTP_USER") && env("SMTP_PASS")) return "smtp";
  return null;
}

/** Sends the enquiry to the business inbox. Throws if the provider rejects it. */
export async function sendMail(mail: Mail) {
  const method = deliveryMethod();
  const to = env("ENQUIRY_TO_EMAIL").split(",").map((s) => s.trim()).filter(Boolean);

  if (method === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env("RESEND_FROM"),
        to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        reply_to: mail.replyTo,
        attachments: mail.attachments.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })),
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return;
  }

  if (method === "smtp") {
    const port = Number(env("SMTP_PORT") || 465);
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: env("SMTP_HOST"),
      port,
      secure: env("SMTP_SECURE") ? env("SMTP_SECURE") === "true" : port === 465,
      auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS") },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
    await transporter.sendMail({
      from: env("SMTP_FROM") || env("SMTP_USER"),
      to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      replyTo: mail.replyTo,
      attachments: mail.attachments,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    return;
  }

  throw new Error("NOT_CONFIGURED");
}
