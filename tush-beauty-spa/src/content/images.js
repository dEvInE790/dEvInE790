/**
 * Photography for the fixed image slots on the site (hero, about, booking banner…).
 *
 * Set `src` to a file inside src/static/ (e.g. 'img/hero.jpg') once a suitable photo
 * is available: the spa's own photos first, otherwise properly licensed stock.
 * Stock is fine for mood shots (towels, botanicals, textures) but should not be
 * presented as the spa's own interior or a client's result.
 *
 * While `src` is null, the slot shows a quiet line-art panel in the brand colours
 * (the `art` motif below) so the layout still reads as finished.
 */
module.exports = {
  hero:       { src: null, alt: '', art: 'arch',       caption: 'Recommended: calm interior or treatment-room photo, portrait, at least 1200×1500' },
  heroDetail: { src: null, alt: '', art: 'sprig',      caption: 'Recommended: close-up detail (products, towels, botanicals), square' },
  about:      { src: null, alt: '', art: 'stones',     caption: 'Recommended: owner portrait or the reception area, portrait' },
  aboutAlt:   { src: null, alt: '', art: 'vessel',     caption: 'Recommended: a treatment in progress (with client consent), landscape' },
  booking:    { src: null, alt: '', art: 'sun',        caption: 'Recommended: wide atmospheric photo of the space, landscape' },
  ownerPortrait: { src: null, alt: '', art: 'arch', caption: 'Owner or team photo (optional)' },
};
