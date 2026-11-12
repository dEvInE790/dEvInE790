import { Quote } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { testimonials } from "@/lib/testimonials";
import { whatsappLink, waMessages } from "@/lib/site";

/**
 * Shows genuine customer reviews from src/lib/testimonials.ts. Until the
 * business supplies reviews, it invites customers to share their experience
 * instead — no invented quotes.
 */
export function Testimonials() {
  return (
    <section className="bg-cream py-28 md:py-36" aria-label="Client stories">
      <div className="container-luxe">
        {testimonials.length > 0 ? (
          <>
            <SectionHeading eyebrow="Client Stories" title={["In our clients'", "own words."]} />
            <Stagger className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t, i) => (
                <StaggerItem key={i} as="article" className="flex flex-col justify-between bg-ivory p-8 md:p-10">
                  <Quote className="h-8 w-8 text-gold" strokeWidth={1} aria-hidden />
                  <blockquote className="display mt-6 text-2xl leading-snug text-espresso">“{t.quote}”</blockquote>
                  <footer className="mt-8 border-t border-espresso/10 pt-5 text-sm">
                    <p className="font-semibold text-espresso">{t.name}</p>
                    {t.detail && <p className="text-taupe">{t.detail}</p>}
                  </footer>
                </StaggerItem>
              ))}
            </Stagger>
          </>
        ) : (
          <div className="grid items-end gap-10 md:grid-cols-12">
            <SectionHeading
              className="md:col-span-7"
              eyebrow="Client Stories"
              title={["Your experience", "matters to us."]}
              intro="We're gathering reviews from the homes and businesses we've furnished. If DE. LAW has made furniture for you, we'd be grateful to hear how it's serving your space."
            />
            <Reveal className="md:col-span-5 md:justify-self-end">
              <ButtonLink href={whatsappLink(waMessages.review)} variant="solid" icon={<WhatsAppIcon className="h-4 w-4" />}>
                Share your experience
              </ButtonLink>
            </Reveal>
          </div>
        )}
      </div>
    </section>
  );
}
