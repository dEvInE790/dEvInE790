import Link from "next/link";
import { Images, MessageSquareQuote, Sofa } from "lucide-react";
import { getCatalogue, getProjects, getTestimonials } from "@/lib/content";
import { deliveryMethod } from "@/lib/mailer";
import { Card, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const [projects, catalogue, testimonials] = await Promise.all([getProjects(true), getCatalogue(true), getTestimonials(true)]);
  const products = catalogue.reduce((n, c) => n + c.products.length, 0);
  const email = deliveryMethod();
  const tiles = [
    { href: "/admin/projects", icon: Images, label: "Projects", value: projects.length, note: `${projects.filter((p) => p.visible).length} visible on the website` },
    { href: "/admin/collections", icon: Sofa, label: "Collections", value: catalogue.length, note: `${products} products` },
    { href: "/admin/testimonials", icon: MessageSquareQuote, label: "Testimonials", value: testimonials.length, note: testimonials.length ? `${testimonials.filter((t) => t.visible).length} visible` : "None yet — add genuine reviews" },
  ];
  return (
    <>
      <PageTitle title="Dashboard" intro="Changes you make here appear on the website straight away." />
      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="group border border-espresso/10 bg-white p-6 transition-colors hover:border-espresso/40">
            <t.icon className="h-5 w-5 text-gold-deep" strokeWidth={1.5} />
            <p className="display mt-4 text-5xl text-espresso">{t.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-espresso">{t.label}</p>
            <p className="mt-2 text-sm text-taupe">{t.note}</p>
          </Link>
        ))}
      </div>
      <Card className="mt-6">
        <h2 className="display text-2xl text-espresso">Quote & contact form emails</h2>
        {email ? (
          <p className="mt-2 text-sm text-[#1f5c3d]">✓ Enquiries are being emailed (via {email === "resend" ? "Resend" : "SMTP"}).</p>
        ) : (
          <p className="mt-2 text-sm text-[#7a2f1f]">
            Not set up yet — website visitors are asked to send enquiries by WhatsApp instead. Add <code>ENQUIRY_TO_EMAIL</code>, <code>RESEND_FROM</code> and{" "}
            <code>RESEND_API_KEY</code> in Cloudflare (Settings → Variables and Secrets) to receive them by email.
          </p>
        )}
      </Card>
    </>
  );
}
