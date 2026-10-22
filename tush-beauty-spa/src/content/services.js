/**
 * Service menu. Add ONLY services the spa actually offers, confirmed by the owner.
 *
 * Each category: { id, name, intro?, services: [...] }
 * Each service:
 *   {
 *     id: 'signature-facial',            // unique, url-safe; used for #anchors and the booking form
 *     name: 'Signature Facial',
 *     description: 'One or two sentences in the spa's own words.',
 *     price: '$95' | 'From $60' | null,   // null hides the price
 *     duration: '60 min' | null,          // null hides the duration
 *     image: 'img/services/signature-facial.jpg' | null,  // file inside src/static/
 *     imageAlt: 'Describe what the photo shows',
 *     featured: true,                     // show on the homepage (first 3–6 featured)
 *   }
 *
 * While this list is empty the site shows a short "menu coming soon" note and
 * invites visitors to ask about a treatment.
 */
module.exports = [];
