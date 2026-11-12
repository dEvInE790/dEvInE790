/**
 * Shared enquiry schema + validation, used by both the browser forms and the
 * /api/enquiry route so the rules can never drift apart.
 */
import { quoteCategories } from "./catalogue";

export type EnquiryType = "quote" | "contact";

export type EnquiryFields = {
  type: EnquiryType;
  name: string;
  phone: string;
  email: string;
  category: string;
  product: string;
  description: string;
  materials: string;
  dimensions: string;
  location: string;
  budget: string;
};

export type FieldErrors = Partial<Record<keyof EnquiryFields | "photos", string>>;

export const LIMITS = {
  name: 100,
  phone: 30,
  email: 160,
  category: 80,
  product: 120,
  description: 3000,
  materials: 300,
  dimensions: 300,
  location: 200,
  budget: 100,
  maxPhotos: 3,
  /** Combined upload limit — kept under typical serverless request limits (4.5 MB). */
  maxTotalPhotoBytes: 3.8 * 1024 * 1024,
} as const;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;

export function phoneDigits(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

export function validateEnquiry(f: EnquiryFields): FieldErrors {
  const e: FieldErrors = {};
  const name = f.name.trim();
  if (name.length < 2) e.name = "Please enter your full name.";
  else if (name.length > LIMITS.name) e.name = "Name is too long.";

  const digits = phoneDigits(f.phone);
  if (!f.phone.trim()) e.phone = "Please enter a phone number we can reach you on.";
  else if (!/^[+\d\s()-]+$/.test(f.phone.trim()) || digits.length < 10 || digits.length > 15)
    e.phone = "Please enter a valid phone number, e.g. 0809 098 6792.";

  if (f.email.trim()) {
    if (f.email.length > LIMITS.email || !EMAIL_RE.test(f.email.trim())) e.email = "Please enter a valid email address, or leave it blank.";
  }

  const desc = f.description.trim();
  if (f.type === "quote") {
    if (!f.category || !quoteCategories.includes(f.category)) e.category = "Please choose a furniture category.";
    if (desc.length < 10) e.description = "Please describe the furniture you'd like (at least a sentence).";
    if (f.location.trim().length < 2) e.location = "Please tell us where the project is located.";
  } else if (desc.length < 5) {
    e.description = "Please enter your message.";
  }
  if (desc.length > LIMITS.description) e.description = `Please keep this under ${LIMITS.description} characters.`;

  (["materials", "dimensions", "location", "budget", "product"] as const).forEach((k) => {
    if (f[k].length > LIMITS[k]) e[k] = "This is too long.";
  });
  return e;
}

/** Labelled, non-empty fields in display order. */
export function enquiryRows(f: EnquiryFields): [string, string][] {
  const rows: [string, string][] = [
    ["Name", f.name],
    ["Phone", f.phone],
    ["Email", f.email],
    ...(f.type === "quote"
      ? ([
          ["Furniture category", f.category],
          ["Product", f.product],
          ["Description", f.description],
          ["Preferred materials", f.materials],
          ["Dimensions / measurements", f.dimensions],
          ["Project location", f.location],
          ["Estimated budget", f.budget],
        ] as [string, string][])
      : ([["Message", f.description]] as [string, string][])),
  ];
  return rows.filter(([, v]) => v && v.trim()).map(([k, v]) => [k, v.trim()]);
}

/** Plain-text summary used for the WhatsApp fallback and the email body. */
export function enquiryToText(f: EnquiryFields) {
  return enquiryRows(f)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}
