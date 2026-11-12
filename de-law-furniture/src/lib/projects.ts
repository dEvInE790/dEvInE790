import type { Img } from "./images";

/**
 * Portfolio entries — GENUINE DE. LAW FURNITURE LTD work only.
 *
 * To add a project, put the photo in /public/images/projects (or a video and
 * a poster frame in /public/videos) and add an entry below. Describe only what
 * the photo shows; do not add client names or locations without permission.
 * Filters with no projects are hidden automatically.
 */

export const projectFilters = [
  { id: "all", label: "All Work" },
  { id: "sofas", label: "Sofas & Seating" },
  { id: "bedroom", label: "Beds" },
  { id: "wardrobes", label: "Wardrobes" },
  { id: "tv", label: "TV Units" },
  { id: "kitchen", label: "Kitchens" },
  { id: "dining", label: "Dining" },
  { id: "office", label: "Offices" },
  { id: "windows", label: "Blinds & Curtains" },
] as const;

export type ProjectFilter = (typeof projectFilters)[number]["id"];

export type Project = {
  id: string;
  title: string;
  category: Exclude<ProjectFilter, "all">;
  description: string;
  /** Photograph — or, for a video project, its poster frame */
  image: Img;
  /** Optional short video (muted autoplay preview in the grid, full playback in the viewer) */
  video?: string;
  /** Visual size in the gallery grid */
  size: "tall" | "wide" | "regular";
};

export const projects: Project[] = [
  // Order matters: it tiles the 3-column gallery into 4 full rows with no gaps.
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
    id: "chaise-lounge-grey",
    title: "Curved Chaise Lounge",
    category: "sofas",
    description: "Sculpted chaise in soft grey fabric on tapered wooden legs.",
    image: { src: "/images/projects/chaise-lounge-grey.jpg", alt: "Curved grey fabric chaise lounge with a sweeping backrest on tapered wooden legs" },
    size: "regular",
  },
  {
    id: "sofa-grey-fabric",
    title: "Grey Fabric Sofa",
    category: "sofas",
    description: "Grey fabric sofa with loose back cushions on slim black legs, still in its protective wrap.",
    image: { src: "/images/projects/sofa-grey-fabric.jpg", alt: "Grey fabric sofa with two back cushions and slim black legs, wrapped in protective plastic" },
    size: "regular",
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
    id: "bed-frames-upholstered",
    title: "Upholstered Bed Frames",
    category: "bedroom",
    description: "Channel-tufted headboards and frames in charcoal and magenta fabric.",
    image: { src: "/images/projects/bed-frames-upholstered.jpg", alt: "Two upholstered bed frames with tall channel-tufted headboards, one charcoal and one magenta" },
    size: "wide",
  },
];

export const projectById = (id: string) => projects.find((p) => p.id === id)!;
export const labelOfFilter = (id: string) => projectFilters.find((f) => f.id === id)?.label ?? id;
