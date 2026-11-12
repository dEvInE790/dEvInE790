"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const services = [
  { title: "Custom furniture manufacturing", text: "Furniture built from scratch to your design, dimensions and choice of materials.", href: "/quote" },
  { title: "Interior furnishing", text: "Living rooms, bedrooms, kitchens and offices furnished as complete, coordinated spaces.", href: "/projects" },
  { title: "Exterior furnishing", text: "Furniture designs for outdoor and exterior spaces, made to suit how you use them.", href: "/quote?category=Exterior%20furniture" },
  { title: "Furniture delivery", text: "Your finished furniture delivered carefully by our team.", href: "/contact" },
  { title: "Furniture installation", text: "Fitted kitchens, wardrobes, blinds, curtains and more — installed on site.", href: "/contact" },
  { title: "Custom customer orders", text: "Have a reference photo or sketch? We'll build to your request.", href: "/quote" },
  { title: "Personalised quotations", text: "Every quote reflects your specification, materials and project details.", href: "/quote" },
];

export function Services() {
  return (
    <section className="bg-cream py-28 md:py-40" aria-label="Our services">
      <div className="container-luxe grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <SectionHeading eyebrow="What we do" title={["Manufacture.", "Furnish.", "Install."]} intro="We manufacture and sell furniture — and we take care of everything around it, from the first measurement to final installation." />
          </div>
        </div>
        <ol className="border-t border-espresso/15 lg:col-span-8">
          {services.map((s, i) => (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
              className="border-b border-espresso/15"
            >
              <Link href={s.href} className="group grid grid-cols-[3rem_1fr_auto] items-start gap-4 py-8 md:grid-cols-[5rem_1fr_auto] md:py-10">
                <span className="display pt-1 text-xl italic text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="display block text-3xl text-espresso transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-2 md:text-4xl">{s.title}</span>
                  <span className="mt-2 block max-w-lg text-sm leading-relaxed text-taupe">{s.text}</span>
                </span>
                <span className="mt-2 flex h-11 w-11 items-center justify-center rounded-full border border-espresso/20 text-espresso transition-all duration-500 group-hover:rotate-45 group-hover:border-espresso group-hover:bg-espresso group-hover:text-ivory">
                  <ArrowUpRight className="h-4 w-4" strokeWidth={1.4} aria-hidden />
                </span>
              </Link>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
