/**
 * Customer testimonials.
 *
 * Only add GENUINE reviews supplied by DE. LAW FURNITURE LTD, with the
 * customer's permission. While this list is empty, the site shows an
 * invitation for customers to share their experience instead of reviews.
 *
 * Example:
 *   { quote: "…", name: "Adaeze O.", detail: "Wardrobe & bed frame, Ikeja" }
 */
export type Testimonial = { quote: string; name: string; detail?: string };

export const testimonials: Testimonial[] = [];
