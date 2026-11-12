import Link from "next/link";
import { Clock, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { ButtonLink } from "@/components/ui/Button";
import { categories } from "@/lib/catalogue";
import { mapsDirectionsUrl, nav, site, whatsappLink, waMessages } from "@/lib/site";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="grain relative overflow-hidden bg-charcoal text-ivory">
      <div className="container-luxe relative pt-24 md:pt-32">
        <div className="flex flex-col gap-10 border-b border-ivory/10 pb-16 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow mb-6 flex items-center gap-4 text-gold">
              <span className="rule" /> Begin your project
            </p>
            <p className="display max-w-3xl text-5xl md:text-7xl">
              Crafting Comfort. <em className="text-gold-light">Defining Spaces.</em>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/quote" variant="gold">Request a Quote</ButtonLink>
            <ButtonLink href={whatsappLink(waMessages.general)} variant="outline-light" icon={<WhatsAppIcon className="h-4 w-4" />}>
              WhatsApp Us
            </ButtonLink>
          </div>
        </div>

        <div className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link href="/" aria-label={`${site.name} — home`}>
              <Logo />
            </Link>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-ivory/60">
              {site.name} manufactures and furnishes all kinds of interior and exterior furniture — crafted from premium wood, fabrics and plywood, delivered and installed. Established {site.establishedLabel}.
            </p>
            {site.socials.length > 0 && (
              <ul className="mt-6 flex gap-5 text-xs uppercase tracking-[0.2em]">
                {site.socials.map((s) => (
                  <li key={s.href}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="link-underline">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lg:col-span-2">
            <h2 className="eyebrow mb-6 text-gold">Explore</h2>
            <ul className="space-y-3 text-sm text-ivory/70">
              {[...nav, { href: "/quote", label: "Request a Quote" }].map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="link-underline hover:text-ivory">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h2 className="eyebrow mb-6 text-gold">Collections</h2>
            <ul className="grid grid-cols-1 gap-3 text-sm text-ivory/70 xs:grid-cols-2 sm:grid-cols-1">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/collections/${c.slug}`} className="link-underline hover:text-ivory">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h2 className="eyebrow mb-6 text-gold">Visit &amp; Contact</h2>
            <ul className="space-y-5 text-sm text-ivory/70">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.4} />
                <a href={mapsDirectionsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-ivory">
                  {site.address.line1},<br />
                  {site.address.line2}, {site.address.city}, {site.address.country}
                </a>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.4} />
                <span className="flex flex-col gap-1">
                  {site.phones.map((p) => (
                    <a key={p.tel} href={`tel:${p.tel}`} className="hover:text-ivory">
                      {p.display}
                    </a>
                  ))}
                </span>
              </li>
              <li className="flex gap-3">
                <WhatsAppIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <a href={whatsappLink(waMessages.general)} target="_blank" rel="noopener noreferrer" className="hover:text-ivory">
                  WhatsApp: {site.whatsapp.display}
                </a>
              </li>
              {site.email && (
                <li className="flex gap-3">
                  <a href={`mailto:${site.email}`} className="hover:text-ivory">
                    {site.email}
                  </a>
                </li>
              )}
              <li className="flex gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.4} />
                <span>Opening hours: {site.hours.label}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div aria-hidden className="pointer-events-none select-none overflow-hidden">
        <p className="display translate-y-[18%] whitespace-nowrap text-center text-[19vw] leading-none text-ivory/[0.04]">DE. LAW</p>
      </div>

      <div className="border-t border-ivory/10">
        <div className="container-luxe flex flex-col gap-3 py-6 text-xs text-ivory/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {site.name}. All rights reserved.</p>
          <p>Egbe, Lagos · Est. {site.establishedYear}</p>
        </div>
      </div>
    </footer>
  );
}
