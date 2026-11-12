import { images, type Img } from "./images";

/**
 * Portfolio entries. The photographs are TEMPORARY placeholders (see
 * src/lib/images.ts). Replace each image with a photograph of a real
 * DE. LAW FURNITURE LTD project and update the title/description to match.
 * Do not add client names or locations without the client's permission.
 */

export const projectFilters = [
  { id: "all", label: "All Work" },
  { id: "living", label: "Living Rooms" },
  { id: "bedroom", label: "Bedrooms" },
  { id: "kitchen", label: "Kitchens" },
  { id: "wardrobes", label: "Wardrobes" },
  { id: "office", label: "Offices" },
  { id: "dining", label: "Dining" },
  { id: "windows", label: "Blinds & Curtains" },
] as const;

export type ProjectFilter = (typeof projectFilters)[number]["id"];

export type Project = {
  id: string;
  title: string;
  category: Exclude<ProjectFilter, "all">;
  description: string;
  image: Img;
  /** Visual size in the gallery grid */
  size: "tall" | "wide" | "regular";
};

export const projects: Project[] = [
  { id: "p1", title: "Living Room Furnishing", category: "living", description: "Sectional sofa, coffee table and coordinated soft furnishings.", image: images.livingBright, size: "wide" },
  { id: "p2", title: "Fitted Kitchen Installation", category: "kitchen", description: "Wall and base cabinets planned, built and installed on site.", image: images.kitchenWhite, size: "tall" },
  { id: "p3", title: "Upholstered Bedroom Suite", category: "bedroom", description: "Upholstered bed frame with matching bedside furniture.", image: images.bedroomHotel, size: "regular" },
  { id: "p4", title: "Executive Office Setting", category: "office", description: "Executive desk, storage and meeting furniture.", image: images.officeDesk, size: "regular" },
  { id: "p5", title: "Family Dining Set", category: "dining", description: "Dining table with upholstered chairs, finished to order.", image: images.dining, size: "wide" },
  { id: "p6", title: "Built-In Wardrobe", category: "wardrobes", description: "Floor-to-ceiling wardrobe with a custom interior layout.", image: images.bedroomLight, size: "tall" },
  { id: "p7", title: "Bedroom Curtains & Blinds", category: "windows", description: "Lined curtains and blinds measured and fitted to each window.", image: images.bedroomSoft, size: "regular" },
  { id: "p8", title: "Lounge Seating", category: "living", description: "Sofa and armchairs upholstered in coordinated fabrics.", image: images.livingLounge, size: "regular" },
  { id: "p9", title: "Modern Kitchen Cabinetry", category: "kitchen", description: "Flat-panel cabinetry with tall storage units.", image: images.kitchenModern, size: "wide" },
  { id: "p10", title: "Open-Plan Office Workstations", category: "office", description: "Team workstations configured to the floor plan.", image: images.office, size: "tall" },
  { id: "p11", title: "Wooden Bed Frame", category: "bedroom", description: "Wooden bed frame with a refined natural finish.", image: images.bedroomLinen, size: "regular" },
  { id: "p12", title: "Living Room Drapery", category: "windows", description: "Floor-length drapes framing living-room windows.", image: images.interiorLamp, size: "regular" },
  { id: "p13", title: "Open Dining Area", category: "dining", description: "Dining furniture for an open-plan living space.", image: images.diningOpen, size: "regular" },
  { id: "p14", title: "Wardrobe & Dressing Area", category: "wardrobes", description: "Storage and dressing furniture designed as one.", image: images.interiorCalm, size: "wide" },
  { id: "p15", title: "TV Wall & Living Space", category: "living", description: "Media wall with storage and display shelving.", image: images.livingModern, size: "regular" },
  { id: "p16", title: "Meeting Room Furniture", category: "office", description: "Conference table and seating for a meeting room.", image: images.officeMeeting, size: "wide" },
];
