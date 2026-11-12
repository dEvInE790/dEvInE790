import { Clock, MapPin, Phone } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { MapEmbed } from "@/components/ui/MapEmbed";
import { mapsDirectionsUrl, site, whatsappLink, waMessages } from "@/lib/site";

export function ContactDetails({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  const label = `eyebrow mb-3 ${dark ? "text-gold" : "text-gold-deep"}`;
  const body = dark ? "text-ivory/80" : "text-espresso";
  const icon = `h-5 w-5 shrink-0 ${dark ? "text-gold" : "text-gold-deep"}`;
  return (
    <ul className="grid gap-10 sm:grid-cols-2">
      <li className="flex gap-4">
        <MapPin className={icon} strokeWidth={1.3} aria-hidden />
        <div>
          <p className={label}>Visit</p>
          <address className={`not-italic leading-relaxed ${body}`}>
            {site.address.line1},<br />
            {site.address.line2},<br />
            {site.address.city}, {site.address.country}
          </address>
          <a href={mapsDirectionsUrl} target="_blank" rel="noopener noreferrer" className={`link-underline mt-3 inline-block pb-0.5 text-xs font-semibold uppercase tracking-[0.2em] ${body}`}>
            Get directions
          </a>
        </div>
      </li>
      <li className="flex gap-4">
        <Phone className={icon} strokeWidth={1.3} aria-hidden />
        <div>
          <p className={label}>Call</p>
          <div className={`flex flex-col gap-1 ${body}`}>
            {site.phones.map((p) => (
              <a key={p.tel} href={`tel:${p.tel}`} className="link-underline w-fit">
                {p.display}
              </a>
            ))}
          </div>
        </div>
      </li>
      <li className="flex gap-4">
        <WhatsAppIcon className={icon} />
        <div>
          <p className={label}>WhatsApp</p>
          <a href={whatsappLink(waMessages.general)} target="_blank" rel="noopener noreferrer" className={`link-underline ${body}`}>
            {site.whatsapp.display}
          </a>
        </div>
      </li>
      <li className="flex gap-4">
        <Clock className={icon} strokeWidth={1.3} aria-hidden />
        <div>
          <p className={label}>Opening hours</p>
          <p className={body}>{site.hours.label}</p>
        </div>
      </li>
      {site.email && (
        <li className="flex gap-4 sm:col-span-2">
          <div>
            <p className={label}>Email</p>
            <a href={`mailto:${site.email}`} className={`link-underline ${body}`}>
              {site.email}
            </a>
          </div>
        </li>
      )}
    </ul>
  );
}

export function ContactSection() {
  return (
    <section className="bg-ivory py-28 md:py-40" aria-label="Contact">
      <div className="container-luxe grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <SectionHeading eyebrow="Contact" title={["Let's talk about", "your space."]} intro="Visit us in Egbe, call, or send a message on WhatsApp. We'll help you plan the right furniture for your home or office." />
          <Reveal delay={0.2} className="mt-14">
            <ContactDetails />
          </Reveal>
          <Reveal delay={0.3} className="mt-12 flex flex-wrap gap-3">
            <ButtonLink href="/quote">Request a Quote</ButtonLink>
            <ButtonLink href={whatsappLink(waMessages.general)} variant="outline-dark" icon={<WhatsAppIcon className="h-4 w-4" />}>
              Chat on WhatsApp
            </ButtonLink>
          </Reveal>
        </div>
        <Reveal className="lg:col-span-6" y={60}>
          <MapEmbed className="aspect-[4/5] w-full sm:aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[520px]" />
        </Reveal>
      </div>
    </section>
  );
}
