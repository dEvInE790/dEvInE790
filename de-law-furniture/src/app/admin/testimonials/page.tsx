"use client";

import { useAdmin } from "@/components/admin/AdminApp";
import { useLoad } from "@/components/admin/useLoad";
import { LoadState } from "@/components/admin/LoadState";
import { PageTitle } from "@/components/admin/ui";
import { TestimonialsManager } from "./TestimonialsManager";

export default function AdminTestimonials() {
  const { api } = useAdmin();
  const { data, error, loading, reload } = useLoad(() => api.listTestimonials(), [api]);
  return (
    <>
      <PageTitle
        title="Testimonials"
        intro="Only add genuine reviews from real customers, with their permission. While there are none, the homepage invites customers to share their experience on WhatsApp."
      />
      {data ? <TestimonialsManager testimonials={data} onChanged={reload} /> : <LoadState loading={loading} error={error} onRetry={reload} />}
    </>
  );
}
