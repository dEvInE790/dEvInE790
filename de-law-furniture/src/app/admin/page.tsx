"use client";

import Link from "next/link";
import { Images, MessageSquareQuote, Sofa } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminApp";
import { useLoad } from "@/components/admin/useLoad";
import { LoadState } from "@/components/admin/LoadState";
import { Card, PageTitle } from "@/components/admin/ui";

export default function Dashboard() {
  const { api, emailConfigured } = useAdmin();
  const { data, error, loading, reload } = useLoad(() => Promise.all([api.listProjects(), api.listCatalogue(), api.listTestimonials()]), [api]);
  return (
    <>
      <PageTitle title="Dashboard" intro="Changes you make here appear on the website straight away." />
      {!data ? (
        <LoadState loading={loading} error={error} onRetry={reload} />
      ) : (
        (() => {
          const [projects, catalogue, testimonials] = data;
          const products = catalogue.reduce((n, c) => n + c.products.length, 0);
          const tiles = [
            { href: "/admin/projects", icon: Images, label: "Projects", value: projects.length, note: `${projects.filter((p) => p.visible).length} visible on the website` },
            { href: "/admin/collections", icon: Sofa, label: "Collections", value: catalogue.length, note: `${products} products` },
            {
              href: "/admin/testimonials",
              icon: MessageSquareQuote,
              label: "Testimonials",
              value: testimonials.length,
              note: testimonials.length ? `${testimonials.filter((t) => t.visible).length} visible` : "None yet — add genuine reviews",
            },
          ];
          return (
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
          );
        })()
      )}
      <Card className="mt-6">
        <h2 className="display text-2xl text-espresso">Quote & contact form emails</h2>
        {emailConfigured ? (
          <p className="mt-2 text-sm text-[#1f5c3d]">✓ Enquiries from the website are being emailed.</p>
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
