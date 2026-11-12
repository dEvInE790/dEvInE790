/**
 * IMAGE REGISTRY — every photograph on the site is referenced from here.
 *
 * These are TEMPORARY stock photographs (Unsplash licence) used until
 * DE. LAW FURNITURE LTD supplies photographs of its own furniture and
 * completed projects. To replace one:
 *   1. Put the new photo in /public/images (e.g. /public/images/sofa-01.jpg)
 *   2. Change its `src` below to "/images/sofa-01.jpg" and update `alt`.
 * If a photo ever fails to load, the site shows a styled placeholder panel
 * instead of a broken image.
 */

export type Img = { src: string; alt: string };

const u = (id: string, w = 2000) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const images = {
  hero: { src: u("1618221195710-dd6b41faaea6", 2400), alt: "Warm, elegantly furnished living room with a tailored sofa" },
  livingWarm: { src: u("1586023492125-27b2c045efd7"), alt: "Living room with upholstered sofa, side tables and soft lighting" },
  livingModern: { src: u("1600210492486-724fe5c67fb0"), alt: "Modern living space with sofa and timber details" },
  livingBright: { src: u("1616486338812-3dadae4b4ace"), alt: "Bright living room with a fabric sofa and cushions" },
  livingNeutral: { src: u("1493663284031-b7e3aefcae8e"), alt: "Neutral-toned living room with a sofa and wooden furniture" },
  livingLounge: { src: u("1616594039964-ae9021a400a0"), alt: "Lounge area with sofa, armchair and coffee table" },
  livingApartment: { src: u("1522708323590-d24dbb6b0267"), alt: "Furnished apartment living room with dining area" },
  sofaVelvet: { src: u("1555041469-a586c61ea9bc"), alt: "Velvet three-seater sofa with button detailing" },
  sofaClassic: { src: u("1567016432779-094069958ea5"), alt: "Upholstered sofa with cushions in a styled room" },
  interiorLamp: { src: u("1513694203232-719a280e022f"), alt: "Interior corner with lamp, curtains and furniture" },
  interiorCalm: { src: u("1600607687939-ce8a6c25118c"), alt: "Calm interior with tailored furniture and natural light" },
  interiorOpen: { src: u("1560448204-e02f11c3d0e2"), alt: "Open-plan furnished interior with sofa and dining space" },
  kitchenWhite: { src: u("1556911220-bff31c812dba"), alt: "Fitted kitchen with cabinets and island" },
  kitchenWarm: { src: u("1556909114-f6e7ad7d3136"), alt: "Kitchen with fitted cabinetry and worktops" },
  kitchenModern: { src: u("1600566753190-17f0baa2a6c3"), alt: "Modern kitchen with flat-panel cabinets" },
  bedroomCalm: { src: u("1505693416388-ac5ce068fe85"), alt: "Bedroom with upholstered bed frame and bedside tables" },
  bedroomSoft: { src: u("1540518614846-7eded433c457"), alt: "Soft-toned bedroom with bed and window curtains" },
  bedroomLinen: { src: u("1522771739844-6a9f6d5f14af"), alt: "Bed frame dressed with linen bedding" },
  bedroomHotel: { src: u("1631049307264-da0ec9d70304"), alt: "Hotel-style bedroom with headboard and curtains" },
  bedroomLight: { src: u("1519710164239-da123dc03ef4"), alt: "Light-filled bedroom with bed and window treatment" },
  dining: { src: u("1617806118233-18e1de247200"), alt: "Dining set with table and upholstered chairs" },
  diningKitchen: { src: u("1484101403633-562f891dc89a"), alt: "Dining table and chairs beside a kitchen" },
  diningOpen: { src: u("1502005229762-cf1b2da7c5d6"), alt: "Open dining area with table and chairs" },
  office: { src: u("1497366216548-37526070297c"), alt: "Office with desks and workstations" },
  officeMeeting: { src: u("1497366811353-6870744d04b2"), alt: "Office meeting space with table and chairs" },
  officeDesk: { src: u("1593062096033-9a26b09da705"), alt: "Executive desk setup" },
  workshop: { src: u("1504148455328-c376907d081c"), alt: "Woodworking tools on a workbench" },
} satisfies Record<string, Img>;

export type ImageKey = keyof typeof images;
