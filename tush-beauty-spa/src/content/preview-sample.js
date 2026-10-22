/**
 * PREVIEW-ONLY sample content (`npm run build:preview`).
 *
 * This fills every slot so the owner can review the full design before real
 * details exist. None of it describes the real business: values in [brackets]
 * are placeholders, and the preview build is marked noindex with a visible
 * "Design preview" banner. The production build (`npm run build`) never uses this file.
 */
const svc = (id, name, art, tone, featured = false) => ({
  id,
  name,
  description: '[One or two sentences describing this treatment in the spa’s own words: what it involves and how it feels.]',
  price: '[Price]',
  duration: '[Duration]',
  image: null,
  art,
  tone,
  featured,
});

module.exports = {
  config: {
    announcement: '[Announcement bar: a verified update such as booking availability]',
    contact: {
      phone: '[Phone number]',
      email: '[Email address]',
      instagram: '[Instagram handle]',
      address: '[Street address], Houston, TX [ZIP]',
      addressNote: '[Parking or arrival note]',
    },
    hours: [
      { days: '[Days]', hours: '[Opening hours]' },
      { days: '[Days]', hours: '[Opening hours]' },
      { days: '[Days]', hours: '[Closed]' },
    ],
    booking: { formEndpoint: 'preview' },
  },
  services: [
    {
      id: 'category-one',
      name: '[Service category]',
      intro: '[Optional short introduction to this category.]',
      services: [
        svc('service-1', '[Service name]', 'sprig', 'ivory', true),
        svc('service-2', '[Service name]', 'vessel', 'sand', true),
        svc('service-3', '[Service name]', 'stones', 'ivory', true),
      ],
    },
    {
      id: 'category-two',
      name: '[Service category]',
      intro: null,
      services: [
        svc('service-4', '[Service name]', 'sun', 'sand'),
        svc('service-5', '[Service name]', 'arch', 'ivory'),
      ],
    },
  ],
  gallery: {
    items: [
      ['space', 'arch', 'sand', true], ['treatments', 'sprig', 'ivory'], ['results', 'stones', 'taupe'],
      ['treatments', 'vessel', 'ivory', true], ['space', 'sun', 'ivory'], ['results', 'sprig', 'sand'],
      ['space', 'stones', 'ivory'], ['treatments', 'arch', 'taupe'], ['results', 'vessel', 'sand', true],
    ].map(([category, motif, tone, tall], i) => ({
      src: `assets/art/${motif}-${tone}.svg`,
      alt: `Placeholder panel ${i + 1}: owner photo to come (${category})`,
      caption: `[Caption: ${category === 'space' ? 'spa interior' : category === 'results' ? 'approved client result' : 'treatment'} photo]`,
      category,
      tall: !!tall,
    })),
  },
  testimonials: [
    { quote: '[An approved client review, quoted exactly as the client wrote it.]', author: '[Client first name]', source: '[Review source]' },
    { quote: '[An approved client review, quoted exactly as the client wrote it.]', author: '[Client first name]', source: '[Review source]' },
    { quote: '[An approved client review, quoted exactly as the client wrote it.]', author: '[Client first name]', source: '[Review source]' },
  ],
};
