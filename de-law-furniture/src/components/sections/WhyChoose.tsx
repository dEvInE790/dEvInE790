"use client";

import { motion } from "framer-motion";
import { Gem, Hammer, PencilRuler, Ruler, Sofa, Truck } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { site } from "@/lib/site";

const reasons = [
  { icon: Gem, title: "Premium materials", text: "We source excellent materials — quality wood, fabrics and plywood — so every piece is built to last." },
  { icon: PencilRuler, title: "Made to your design", text: "Sizes, finishes, fabrics and details are tailored to your space, taste and requirements." },
  { icon: Hammer, title: "Quality craftsmanship", text: "Careful joinery, upholstery and finishing standards applied to every project, large or small." },
  { icon: Sofa, title: "Interior & exterior", text: "All kinds of interior and exterior furniture designs, from single pieces to complete furnishing." },
  { icon: Truck, title: "Delivery & installation", text: "Our team delivers and installs your furniture, so it arrives and fits exactly as intended." },
  { icon: Ruler, title: "Personal quotations", text: "No one-size price list. Each quotation reflects your specifications, materials and project." },
];

export function WhyChoose() {
  return (
    <section className="grain relative overflow-hidden bg-espresso py-28 text-ivory md:py-40" aria-label={`Why choose ${site.name}`}>
      <div className="container-luxe relative">
        <div className="grid gap-12 lg:grid-cols-12">
          <SectionHeading
            className="lg:col-span-5"
            tone="dark"
            eyebrow={`Why ${site.shortName}`}
            title={["Why choose", "DE. LAW?"]}
            intro="Making furniture for homes and businesses since 2015 has taught us that quality is in the details — in the materials we choose and the care we take with each piece."
          />
          <ol className="grid gap-px bg-ivory/10 sm:grid-cols-2 lg:col-span-7">
            {reasons.map((r, i) => (
              <motion.li
                key={r.title}
                className="group relative bg-espresso p-8 md:p-10"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: (i % 2) * 0.12 }}
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-gold transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
                <div className="flex items-start justify-between">
                  <r.icon className="h-7 w-7 text-gold transition-transform duration-700 group-hover:-translate-y-1" strokeWidth={1.1} />
                  <span className="display text-xl italic text-ivory/30">0{i + 1}</span>
                </div>
                <h3 className="display mt-10 text-3xl">{r.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ivory/60">{r.text}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
