"use client";

import { useState } from "react";
import { enquiryToText, validateEnquiry, type EnquiryFields, type FieldErrors } from "@/lib/enquiry";
import { whatsappLink } from "@/lib/site";

export type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; reference: string }
  | { status: "unavailable"; message: string; whatsapp: string }
  | { status: "error"; message: string; whatsapp: string };

/** Submits an enquiry to /api/enquiry and reports exactly what happened — never a fake success. */
export function useEnquiry() {
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = async (fields: EnquiryFields, photos: File[] = []) => {
    const clientErrors = validateEnquiry(fields);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) {
      const first = Object.keys(clientErrors)[0];
      document.getElementById(`f-${first}`)?.focus();
      return;
    }

    const heading = fields.type === "quote" ? "Hello DE. LAW FURNITURE LTD, I'd like to request a quotation." : "Hello DE. LAW FURNITURE LTD, I have an enquiry.";
    const whatsapp = whatsappLink(`${heading}\n\n${enquiryToText(fields)}${photos.length ? "\n\n(I have reference photos to share.)" : ""}`);

    setState({ status: "submitting" });
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    photos.forEach((p) => fd.append("photos", p, p.name));
    const honeypot = (document.querySelector('input[name="company_website"]') as HTMLInputElement | null)?.value;
    if (honeypot) fd.append("company_website", honeypot);

    try {
      const res = await fetch("/api/enquiry", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; reference?: string; code?: string; message?: string; errors?: FieldErrors };
      if (res.ok && data.ok) {
        setState({ status: "success", reference: data.reference || "" });
        return;
      }
      if (data.code === "INVALID" && data.errors) {
        setErrors(data.errors);
        setState({ status: "idle" });
        return;
      }
      if (data.code === "NOT_CONFIGURED") {
        setState({ status: "unavailable", message: data.message || "Online enquiries are not available at the moment.", whatsapp });
        return;
      }
      setState({ status: "error", message: data.message || "Something went wrong and your enquiry was not sent.", whatsapp });
    } catch {
      setState({ status: "error", message: "We couldn't reach our server — please check your connection. Your enquiry has not been sent.", whatsapp });
    }
  };

  return { state, setState, errors, setErrors, submit };
}

/** Downscales large photos in the browser so uploads are quick on mobile data. */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("not-image");
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("unsupported");
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("unsupported");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  if (!blob) throw new Error("unsupported");
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}
