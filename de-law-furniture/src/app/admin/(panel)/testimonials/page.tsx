import { getTestimonials } from "@/lib/content";
import { PageTitle } from "@/components/admin/ui";
import { TestimonialsManager } from "./TestimonialsManager";

export const metadata = { title: "Testimonials" };

export default async function AdminTestimonials() {
  const testimonials = await getTestimonials(true);
  return (
    <>
      <PageTitle
        title="Testimonials"
        intro="Only add genuine reviews from real customers, with their permission. While there are none, the homepage invites customers to share their experience on WhatsApp."
      />
      <TestimonialsManager testimonials={testimonials} />
    </>
  );
}
