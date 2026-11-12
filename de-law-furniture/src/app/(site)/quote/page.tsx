import type { Metadata } from "next";
import { Suspense } from "react";
import { Clock, MessageCircle, Ruler, Truck } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { QuoteForm } from "@/components/forms/QuoteForm";
import { Reveal } from "@/components/motion/Reveal";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { images } from "@/lib/images";
import { site, whatsappLink, waMessages } from "@/lib/site";
import { getCatalogue } from "@/lib/content";
import { buildQuoteCategories } from "@/lib/quote";

export const metadata: Metadata = {
  title: "Request a Quotation — Custom Furniture",
  description: `Request a personalised furniture quotation from ${site.name}. Tell us what you need — sofas, kitchen cabinets, wardrobes, beds, dining sets, office furniture, blinds or curtains — and we'll quote for your exact requirements.`,
  alternates: { canonical: "/quote" },
};

const next = [
  { icon: MessageCircle, title: "We review your request", text: "Our team looks at your requirements, materials and any reference photos." },
  { icon: Ruler, title: "We confirm the details", text: "We'll call to clarify measurements, finishes and anything else needed." },
  { icon: Clock, title: "You receive your quotation", text: "A personal quotation based on your exact specification." },
  { icon: Truck, title: "We make, deliver & install", text: "Once approved, your furniture is crafted, delivered and installed." },
];

export default async function QuotePage() {
  const categories = buildQuoteCategories((await getCatalogue()).map((c) => c.name));
  return (
    <>
      <PageHero
        eyebrow="Custom Furniture Quotation"
        title={["Tell us what", "you have in mind."]}
        image={images.kitchenModern}
        crumbs={[{ href: "/", label: "Home" }, { href: "/quote", label: "Request a Quote" }]}
        intro="Every piece we make is tailored to its owner, so every quotation is too. Share a few details and we'll prepare one for your exact requirements."
      />
      <section className="bg-ivory py-24 md:py-32" aria-label="Quotation request">
        <div className="container-luxe grid gap-16 lg:grid-cols-12">
          <aside className="order-2 lg:order-1 lg:col-span-4">
            <div className="space-y-10 lg:sticky lg:top-32">
              <Reveal>
                <p className="eyebrow mb-6 flex items-center gap-4 text-gold-deep">
                  <span className="rule" /> What happens next
                </p>
                <ol className="space-y-7">
                  {next.map((s, i) => (
                    <li key={s.title} className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-espresso/15 text-gold-deep">
                        <s.icon className="h-4 w-4" strokeWidth={1.4} aria-hidden />
                      </span>
                      <div>
                        <p className="font-semibold text-espresso">
                          <span className="sr-only">Step {i + 1}: </span>
                          {s.title}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-taupe">{s.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Reveal>
              <Reveal className="bg-espresso p-8 text-ivory">
                <p className="display text-2xl">Rather talk it through?</p>
                <p className="mt-2 text-sm text-ivory/70">Message us on WhatsApp or call during opening hours, {site.hours.label}.</p>
                <a href={whatsappLink(waMessages.custom)} target="_blank" rel="noopener noreferrer" className="mt-5 flex items-center gap-2 text-sm text-gold-light hover:text-ivory">
                  <WhatsAppIcon className="h-4 w-4" /> WhatsApp {site.whatsapp.display}
                </a>
                {site.phones.map((p) => (
                  <a key={p.tel} href={`tel:${p.tel}`} className="mt-2 block text-sm text-ivory/80 hover:text-ivory">
                    Call {p.display}
                  </a>
                ))}
              </Reveal>
            </div>
          </aside>
          <div className="order-1 lg:order-2 lg:col-span-8">
            <Suspense fallback={<div className="h-[80vh]" />}>
              <QuoteForm categories={categories} />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
}
