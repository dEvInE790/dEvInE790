"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Honeypot, TextArea, TextField } from "./Fields";
import { FormProblem, FormSuccess } from "./FormOutcome";
import { compressImage, useEnquiry } from "./useEnquiry";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { LIMITS, type EnquiryFields } from "@/lib/enquiry";
import { whatsappLink, waMessages } from "@/lib/site";
import { cn } from "@/lib/utils";

const empty: EnquiryFields = {
  type: "quote",
  name: "",
  phone: "",
  email: "",
  category: "",
  product: "",
  description: "",
  materials: "",
  dimensions: "",
  location: "",
  budget: "",
};

type Photo = { file: File; url: string };

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-espresso/10 pt-10">
      <legend className="float-left mb-8 flex w-full items-baseline gap-4">
        <span className="display text-2xl italic text-gold-deep">{n}</span>
        <span className="display text-3xl text-espresso">{title}</span>
      </legend>
      <div className="clear-both grid gap-8 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function QuoteForm({ categories: quoteCategories }: { categories: string[] }) {
  const params = useSearchParams();
  const [fields, setFields] = useState<EnquiryFields>(empty);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const { state, setState, errors, setErrors, submit } = useEnquiry(quoteCategories);
  const fileInput = useRef<HTMLInputElement>(null);
  const groupId = useId();

  // Pre-fill from "Request a Quote" links on product and category pages.
  useEffect(() => {
    const category = params.get("category");
    const product = params.get("product");
    setFields((f) => ({
      ...f,
      category: category && quoteCategories.includes(category) ? category : f.category,
      product: product?.slice(0, LIMITS.product) ?? f.product,
      description: product && !f.description ? `I'm interested in the ${product}. ` : f.description,
    }));
  }, [params, quoteCategories]);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  const set = (k: keyof EnquiryFields) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const addPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    e.target.value = "";
    if (!list.length) return;
    setErrors((er) => ({ ...er, photos: undefined }));
    const room = LIMITS.maxPhotos - photos.length;
    if (room <= 0) return setErrors((er) => ({ ...er, photos: `You can attach up to ${LIMITS.maxPhotos} photographs.` }));
    setPhotoBusy(true);
    const added: Photo[] = [];
    for (const file of list.slice(0, room)) {
      try {
        const small = await compressImage(file);
        added.push({ file: small, url: URL.createObjectURL(small) });
      } catch {
        setErrors((er) => ({ ...er, photos: `“${file.name}” couldn't be read. Please use a JPEG or PNG photo.` }));
      }
    }
    const total = [...photos, ...added].reduce((n, p) => n + p.file.size, 0);
    if (total > LIMITS.maxTotalPhotoBytes) {
      added.forEach((p) => URL.revokeObjectURL(p.url));
      setErrors((er) => ({ ...er, photos: "Those photographs are too large together. Please attach fewer images." }));
    } else {
      setPhotos((p) => [...p, ...added]);
    }
    if (list.length > room) setErrors((er) => ({ ...er, photos: `Only the first ${room} photo(s) were added — the limit is ${LIMITS.maxPhotos}.` }));
    setPhotoBusy(false);
  };

  const removePhoto = (i: number) =>
    setPhotos((p) => {
      URL.revokeObjectURL(p[i].url);
      return p.filter((_, j) => j !== i);
    });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(fields, photos.map((p) => p.file));
  };

  if (state.status === "success") {
    return (
      <FormSuccess
        name={fields.name}
        phone={fields.phone}
        reference={state.reference}
        title="Your quotation request has been received. We'll review your requirements and get back to you with a personalised quotation."
      >
        <ButtonLink href="/collections">Continue browsing</ButtonLink>
        <button
          type="button"
          className={buttonClass("outline-dark")}
          onClick={() => {
            setFields(empty);
            setPhotos([]);
            setState({ status: "idle" });
          }}
        >
          Send another request
        </button>
      </FormSuccess>
    );
  }

  const submitting = state.status === "submitting";

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-14" aria-describedby="quote-required-note">
      <Honeypot />
      <p id="quote-required-note" className="text-sm text-taupe">
        Fields marked <span className="text-gold-deep">*</span> are required. There are no fixed prices — your quotation is prepared for your exact requirements.
      </p>

      <Step n="01" title="About you">
        <TextField name="name" label="Full name" autoComplete="name" value={fields.name} onChange={set("name")} error={errors.name} maxLength={LIMITS.name} />
        <TextField name="phone" label="Phone number" type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. 0809 098 6792" value={fields.phone} onChange={set("phone")} error={errors.phone} maxLength={LIMITS.phone} />
        <TextField name="email" label="Email address" type="email" autoComplete="email" optional value={fields.email} onChange={set("email")} error={errors.email} maxLength={LIMITS.email} className="md:col-span-2" />
      </Step>

      <Step n="02" title="Your furniture">
        <div className="md:col-span-2" role="radiogroup" aria-labelledby={`${groupId}-cat`} aria-describedby={errors.category ? "f-category-error" : undefined}>
          <p id={`${groupId}-cat`} className="eyebrow mb-4 flex items-center gap-2 text-espresso/80">
            Furniture category <span aria-hidden className="text-gold-deep">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {quoteCategories.map((c, i) => (
              <label key={c} className="relative cursor-pointer">
                <input
                  id={i === 0 ? "f-category" : undefined}
                  type="radio"
                  name="category"
                  value={c}
                  checked={fields.category === c}
                  onChange={() => {
                    setFields((f) => ({ ...f, category: c }));
                    setErrors((er) => ({ ...er, category: undefined }));
                  }}
                  className="peer sr-only"
                />
                <span className="inline-flex min-h-11 items-center border border-espresso/20 px-4 py-2.5 text-sm text-espresso transition-colors duration-300 hover:border-espresso peer-checked:border-espresso peer-checked:bg-espresso peer-checked:text-ivory peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-deep">
                  {c}
                </span>
              </label>
            ))}
          </div>
          {errors.category && (
            <p id="f-category-error" role="alert" className="mt-3 text-xs font-medium text-[#a4442e]">
              {errors.category}
            </p>
          )}
          {fields.product && (
            <p className="mt-4 flex items-center gap-3 text-sm text-taupe">
              Enquiring about: <strong className="font-semibold text-espresso">{fields.product}</strong>
              <button type="button" className="text-xs underline underline-offset-4 hover:text-espresso" onClick={() => setFields((f) => ({ ...f, product: "" }))}>
                remove
              </button>
            </p>
          )}
        </div>
        <TextArea
          name="description"
          label="Describe the furniture you'd like"
          placeholder="Style, colour, number of seats or units, anything you have in mind…"
          value={fields.description}
          onChange={set("description")}
          error={errors.description}
          maxLength={LIMITS.description}
          className="md:col-span-2"
        />
        <TextField name="materials" label="Preferred materials" optional placeholder="e.g. wood type, fabric, plywood finish" value={fields.materials} onChange={set("materials")} error={errors.materials} maxLength={LIMITS.materials} />
        <TextField name="dimensions" label="Dimensions or measurements" optional placeholder="e.g. wall is 3.2m wide, 2.7m high" value={fields.dimensions} onChange={set("dimensions")} error={errors.dimensions} maxLength={LIMITS.dimensions} />
      </Step>

      <Step n="03" title="Project details">
        <TextField name="location" label="Project location" autoComplete="address-level2" placeholder="Area / city, e.g. Ikeja, Lagos" value={fields.location} onChange={set("location")} error={errors.location} maxLength={LIMITS.location} />
        <TextField name="budget" label="Estimated budget" optional placeholder="Helps us recommend suitable materials" value={fields.budget} onChange={set("budget")} error={errors.budget} maxLength={LIMITS.budget} />
      </Step>

      <fieldset className="border-t border-espresso/10 pt-10">
        <legend className="float-left mb-3 flex w-full items-baseline gap-4">
          <span className="display text-2xl italic text-gold-deep">04</span>
          <span className="display text-3xl text-espresso">Reference photographs</span>
        </legend>
        <p className="clear-both mb-6 text-sm text-taupe">Optional — up to {LIMITS.maxPhotos} photos of a design you like, or of the space to be furnished.</p>
        <div className="flex flex-wrap gap-3">
          <AnimatePresence>
            {photos.map((p, i) => (
              <motion.div key={p.url} className="relative h-28 w-28 overflow-hidden bg-cream" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Reference photo ${i + 1}`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => removePhoto(i)} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center bg-espresso/80 text-ivory hover:bg-espresso" aria-label={`Remove reference photo ${i + 1}`}>
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {photos.length < LIMITS.maxPhotos && (
            <button
              type="button"
              id="f-photos"
              onClick={() => fileInput.current?.click()}
              disabled={photoBusy}
              aria-describedby={errors.photos ? "f-photos-error" : undefined}
              className="flex h-28 w-28 flex-col items-center justify-center gap-2 border border-dashed border-espresso/30 text-xs text-taupe transition-colors hover:border-espresso hover:text-espresso disabled:opacity-60"
            >
              {photoBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" strokeWidth={1.4} />}
              {photoBusy ? "Preparing…" : "Add photo"}
            </button>
          )}
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/*" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={addPhotos} />
        </div>
        {errors.photos && (
          <p id="f-photos-error" role="alert" className="mt-3 text-xs font-medium text-[#a4442e]">
            {errors.photos}
          </p>
        )}
      </fieldset>

      <FormProblem state={state} />

      <div className="flex flex-col gap-5 border-t border-espresso/10 pt-10 sm:flex-row sm:items-center sm:justify-between">
        <button type="submit" disabled={submitting} className={cn(buttonClass("solid"), "min-h-14 px-10 disabled:cursor-wait disabled:opacity-80")}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> <span>Sending…</span>
            </>
          ) : (
            <span>REQUEST MY QUOTATION</span>
          )}
        </button>
        <a href={whatsappLink(waMessages.quote)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-taupe hover:text-espresso">
          <WhatsAppIcon className="h-4 w-4 text-[#1f7a4d]" /> Prefer WhatsApp? Chat with us instead
        </a>
      </div>
      <p className="text-xs text-taupe/80">Your details are sent only to DE. LAW FURNITURE LTD and used solely to respond to your enquiry.</p>
    </form>
  );
}
