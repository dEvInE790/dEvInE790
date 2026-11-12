import type { SeedProject } from "./types";

/**
 * SEED DATA for the projects gallery — GENUINE DE. LAW FURNITURE LTD work only.
 * Copied into the database on first run; after that, projects are managed at /admin.
 * Describe only what the photo shows; do not add client names or locations
 * without permission.
 */

export const seedProjects: SeedProject[] = [
  // Order and sizes tile the 3-column gallery into full rows with no gaps
  // (2 wide + 7 tall + 3 regular = 21 cells = 7 rows).
  {
    id: "sofa-sets-black",
    title: "Channel-Tufted Sofa Sets",
    category: "sofas",
    description: "A run of black channel-tufted sofas finished with gold-toned legs.",
    image: { src: "/images/projects/sofa-sets-black.jpg", alt: "Several black channel-tufted sofas with gold-toned legs, finished and lined up outdoors" },
    size: "wide",
  },
  {
    id: "sofa-set-tan",
    title: "Tan Sofa Set with Gold Trim",
    category: "sofas",
    description: "Channel-stitched sofa set in tan, with gold-trimmed arm panels and matching accent cushions.",
    image: { src: "/videos/sofa-set-tan-poster.jpg", alt: "Tan channel-stitched sofa with gold-trimmed arms and a gold-striped cushion" },
    video: "/videos/sofa-set-tan.mp4",
    size: "tall",
  },
  {
    id: "wardrobe-oak",
    title: "Six-Door Wardrobe",
    category: "wardrobes",
    description: "Oak-effect wardrobe with full-height doors, drawers and black bar handles.",
    image: { src: "/images/projects/wardrobe-oak-six-door.jpg", alt: "Tall oak-effect wardrobe with six doors, drawers and black bar handles" },
    size: "tall",
  },
  {
    id: "tv-wall-unit",
    title: "TV Wall Unit with LED Lighting",
    category: "tv",
    description: "Gloss-white media wall with concealed LED backlighting and a long floating console.",
    image: { src: "/videos/tv-wall-unit-poster.jpg", alt: "White gloss TV wall panel with warm LED backlighting above a floating white console" },
    video: "/videos/tv-wall-unit.mp4",
    size: "tall",
  },
  {
    id: "zebra-blind-brown",
    title: "Zebra Roller Blind",
    category: "windows",
    description: "Dark-brown day-and-night zebra blind, made to measure and fitted to the window.",
    image: { src: "/images/projects/zebra-blind-brown.jpg", alt: "Dark-brown zebra roller blind fitted over a window, with a wrapped grey sofa in front" },
    size: "tall",
  },
  {
    id: "bed-frames-upholstered",
    title: "Upholstered Bed Frames",
    category: "bedroom",
    description: "Channel-tufted headboards and frames in charcoal and magenta fabric.",
    image: { src: "/images/projects/bed-frames-upholstered.jpg", alt: "Two upholstered bed frames with tall channel-tufted headboards, one charcoal and one magenta" },
    size: "regular",
  },
  {
    id: "chaise-lounge-grey",
    title: "Curved Chaise Lounge",
    category: "sofas",
    description: "Sculpted chaise in soft grey fabric on tapered wooden legs.",
    image: { src: "/images/projects/chaise-lounge-grey.jpg", alt: "Curved grey fabric chaise lounge with a sweeping backrest on tapered wooden legs" },
    size: "regular",
  },
  {
    id: "tufted-sofas-in-production",
    title: "Button-Tufted Sofas in Production",
    category: "sofas",
    description: "Black and grey button-tufted sofas taking shape in our workshop yard.",
    image: { src: "/images/projects/tufted-sofas-in-production.jpg", alt: "Rows of black and grey button-tufted sofas being made outdoors in the workshop yard" },
    size: "wide",
  },
  {
    id: "sectional-sofa-curtains",
    title: "Sectional Sofa & Matching Drapery",
    category: "sofas",
    description: "Charcoal L-shaped sofa with button-tufted back, paired with grey curtains under gold-trimmed valances.",
    image: { src: "/images/projects/sectional-sofa-curtains.jpg", alt: "Charcoal L-shaped sofa in a bright room with grey curtains, sheers and gold-trimmed valances" },
    size: "tall",
    focus: "50% 62%",
  },
  {
    id: "curtains-valance-tassels",
    title: "Curtains with Valance & Tassel Trim",
    category: "windows",
    description: "Grey lined curtains with sheers, box valances edged in gold, tassel trim and tie-backs.",
    image: { src: "/images/projects/curtains-valance-tassels.jpg", alt: "Grey curtains with white sheers under box valances trimmed with gold braid and tassels" },
    size: "tall",
    focus: "50% 30%",
  },
  {
    id: "white-x-frame-tables",
    title: "White X-Frame Tables",
    category: "tables",
    description: "Gloss-white tables with crossed-frame bases, freshly finished on the workbench.",
    image: { src: "/images/projects/white-x-frame-tables.jpg", alt: "Gloss-white tables with crossed X-frame bases on a workshop bench" },
    size: "tall",
    focus: "50% 45%",
  },
  {
    id: "sofa-grey-fabric",
    title: "Grey Fabric Sofa",
    category: "sofas",
    description: "Grey fabric sofa with loose back cushions on slim black legs, still in its protective wrap.",
    image: { src: "/images/projects/sofa-grey-fabric.jpg", alt: "Grey fabric sofa with two back cushions and slim black legs, wrapped in protective plastic" },
    size: "regular",
  },
];
