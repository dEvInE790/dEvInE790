import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { ContactDetails } from "@/components/sections/ContactSection";
import { ContactForm } from "@/components/forms/ContactForm";
import { MapEmbed } from "@/components/ui/MapEmbed";
import { ButtonLink } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { images } from "@/lib/images";
import { site, whatsappLink, waMessages } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us — Egbe, Lagos",
  description: `Visit ${site.name} at ${site.address.full}. Call ${site.phones.map((p) => p.display).join(" or ")}, chat on WhatsApp, or send an enquiry. Open ${site.hours.label}.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact Us"
        title={["Let's create", "something lasting."]}
        image={images.diningOpen}
        crumbs={[{ href: "/", label: "Home" }, { href: "/contact", label: "Contact" }]}
        intro="Call us, chat on WhatsApp, visit us in Egbe or send an enquiry below. We'd love to hear about your project."
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={whatsappLink(waMessages.general)} variant="gold" icon={<WhatsAppIcon className="h-4 w-4" />}>
            Chat on WhatsApp
          </ButtonLink>
          <ButtonLink href={`tel:${site.phones[0].tel}`} variant="outline-light" icon={false}>
            Call {site.phones[0].display}
          </ButtonLink>
        </div>
      </PageHero>

      <section className="bg-ivory py-24 md:py-32" aria-label="Contact details and enquiry form">
        <div className="container-luxe grid gap-20 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading eyebrow="Get in touch" title={["We're here", "to help."]} />
            <Reveal delay={0.2} className="mt-12">
              <ContactDetails />
            </Reveal>
          </div>
          <Reveal className="lg:col-span-6 lg:col-start-7" y={50}>
            <div className="bg-cream p-6 sm:p-10 md:p-12">
              <h2 className="display text-4xl text-espresso">Send an enquiry</h2>
              <p className="mb-10 mt-3 text-sm text-taupe">Leave your details and we&apos;ll call you back during opening hours.</p>
              <ContactForm />
            </div>
          </Reveal>
        </div>
      </section>

      <section aria-label="Map" className="bg-ivory pb-4 md:px-6 md:pb-6">
        <MapEmbed className="h-[60vh] min-h-[420px] w-full" />
      </section>
    </>
  );
}
