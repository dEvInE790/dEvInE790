/**
 * Gallery. Use ONLY the spa's own photos that the owner has permission to publish
 * (their Instagram photos are fine once they confirm). Do not add stock photos here:
 * this section is presented as the spa's real space and real work.
 *
 * Each item:
 *   {
 *     src: 'img/gallery/treatment-room.jpg',   // full-size file inside src/static/
 *     thumb: 'img/gallery/treatment-room-thumb.jpg' | null,  // optional smaller version
 *     alt: 'Treatment room with soft lighting and a heated bed',
 *     caption: 'Our treatment room' | null,
 *     category: 'space' | 'treatments' | 'results',   // must match a filter id below
 *     tall: false,    // true for portrait images (spans two rows in the grid)
 *   }
 *
 * Results photos: only publish with the client's consent, unedited, and never as
 * before/after comparisons that imply outcomes the spa cannot reliably deliver.
 */
module.exports = {
  filters: [
    { id: 'space', label: 'The Space' },
    { id: 'treatments', label: 'Treatments' },
    { id: 'results', label: 'Results' },
  ],
  items: [],
};
