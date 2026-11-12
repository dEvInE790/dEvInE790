/**
 * Single source of truth for verified business information.
 * Only edit these values with information confirmed by DE. LAW FURNITURE LTD.
 */

export const WHATSAPP_NUMBER = "2348090986792"; // international format, digits only

export const site = {
  name: "DE. LAW FURNITURE LTD",
  shortName: "DE. LAW",
  tagline: "Crafting Comfort. Defining Spaces.",
  description:
    "DE. LAW FURNITURE LTD is a Lagos furniture manufacturing and furnishing company specialising in all kinds of interior and exterior furniture — sofas, kitchen cabinets, bed frames, wardrobes, dining sets, TV consoles, office furniture, window blinds and curtains. Custom-made, delivered and installed.",
  established: "2015-01-10",
  establishedLabel: "10 January 2015",
  establishedYear: 2015,
  address: {
    line1: "No. 5, Yusuf Olatunji Street",
    line2: "Liasu Road, Egbe",
    city: "Lagos",
    country: "Nigeria",
    full: "No. 5, Yusuf Olatunji Street, Liasu Road, Egbe, Lagos, Nigeria",
  },
  phones: [
    { display: "0809 098 6792", tel: "+2348090986792" },
    { display: "0803 351 5508", tel: "+2348033515508" },
  ],
  whatsapp: {
    display: "0809 098 6792",
    number: WHATSAPP_NUMBER,
  },
  hours: {
    label: "9:00 AM – 6:00 PM",
    opens: "09:00",
    closes: "18:00",
  },
  /** Set when the business supplies an email address. Leave null to hide it. */
  email: null as string | null,
  /** Add social profiles when supplied, e.g. { label: "Instagram", href: "https://instagram.com/..." } */
  socials: [] as { label: string; href: string }[],
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
};

/**
 * While this is true, project/portfolio sections show a discreet note that the
 * photographs are representative. Set to false once the company's own project
 * photographs have replaced the temporary stock images in src/lib/images.ts.
 */
export const USING_PLACEHOLDER_PHOTOS = true;

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const waMessages = {
  general: "Hello DE. LAW FURNITURE LTD, I found you through your website and I'd like to make an enquiry.",
  custom:
    "Hello DE. LAW FURNITURE LTD, I'd like to discuss a custom furniture order. Here are some details about what I have in mind:",
  quote: "Hello DE. LAW FURNITURE LTD, I'd like to request a quotation for furniture.",
  product: (product: string, category: string) =>
    `Hello DE. LAW FURNITURE LTD, I'm interested in the ${product} (${category}) I saw on your website. Could you share more details and a quotation?`,
  category: (category: string) =>
    `Hello DE. LAW FURNITURE LTD, I'm interested in your ${category}. Could you tell me more and share a quotation?`,
  review:
    "Hello DE. LAW FURNITURE LTD, I'm a customer and I'd like to share my experience of working with you:",
};

export const mapsEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(site.address.full)}&output=embed`;
export const mapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(site.address.full)}`;

export const nav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/collections", label: "Collections" },
  { href: "/projects", label: "Projects" },
  { href: "/contact", label: "Contact" },
];
