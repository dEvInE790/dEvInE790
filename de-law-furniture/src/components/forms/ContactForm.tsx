"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Honeypot, TextArea, TextField } from "./Fields";
import { FormProblem, FormSuccess } from "./FormOutcome";
import { useEnquiry } from "./useEnquiry";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { LIMITS, type EnquiryFields } from "@/lib/enquiry";
import { cn } from "@/lib/utils";

const empty: EnquiryFields = { type: "contact", name: "", phone: "", email: "", category: "", product: "", description: "", materials: "", dimensions: "", location: "", budget: "" };

export function ContactForm() {
  const [fields, setFields] = useState<EnquiryFields>(empty);
  const { state, setState, errors, setErrors, submit } = useEnquiry();

  const set = (k: keyof EnquiryFields) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(fields);
  };

  if (state.status === "success") {
    return (
      <FormSuccess name={fields.name} phone={fields.phone} reference={state.reference} title="Your message has been received.">
        <ButtonLink href="/collections">Browse collections</ButtonLink>
        <button type="button" className={buttonClass("outline-dark")} onClick={() => { setFields(empty); setState({ status: "idle" }); }}>
          Send another message
        </button>
      </FormSuccess>
    );
  }

  const submitting = state.status === "submitting";
  return (
    <form onSubmit={onSubmit} noValidate className="relative grid gap-8 md:grid-cols-2">
      <Honeypot />
      <TextField name="name" label="Full name" autoComplete="name" value={fields.name} onChange={set("name")} error={errors.name} maxLength={LIMITS.name} />
      <TextField name="phone" label="Phone number" type="tel" inputMode="tel" autoComplete="tel" value={fields.phone} onChange={set("phone")} error={errors.phone} maxLength={LIMITS.phone} />
      <TextField name="email" label="Email address" type="email" autoComplete="email" optional value={fields.email} onChange={set("email")} error={errors.email} className="md:col-span-2" maxLength={LIMITS.email} />
      <TextArea name="description" label="Your message" value={fields.description} onChange={set("description")} error={errors.description} className="md:col-span-2" maxLength={LIMITS.description} />
      <div className="md:col-span-2">
        <FormProblem state={state} />
      </div>
      <div className="flex flex-col gap-4 md:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <button type="submit" disabled={submitting} className={cn(buttonClass("solid"), "min-h-14 px-10 disabled:cursor-wait disabled:opacity-80")}>
          {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> <span>Sending…</span></>) : <span>Send Enquiry</span>}
        </button>
        <p className="text-xs text-taupe">Need a detailed price? Use our <a href="/quote" className="underline underline-offset-4 hover:text-espresso">quotation form</a>.</p>
      </div>
    </form>
  );
}
