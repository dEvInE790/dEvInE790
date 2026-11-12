/** Shared content types — safe to import from both server and client code. */

export type Img = { src: string; alt: string };

export type ProjectCategory = "sofas" | "bedroom" | "wardrobes" | "tv" | "tables" | "kitchen" | "dining" | "office" | "windows";
export type TileSize = "tall" | "wide" | "regular";

export type Product = {
  id: number;
  slug: string;
  name: string;
  summary: string;
  description: string;
  features: string[];
  images: Img[];
  visible: boolean;
};

export type Category = {
  id: number;
  slug: string;
  name: string;
  singular: string;
  /** Display number, e.g. "01" — derived from the category's position */
  index: string;
  tagline: string;
  intro: string;
  cover: Img;
  customisation: string[];
  products: Product[];
  visible: boolean;
};

export type Project = {
  id: number;
  title: string;
  category: ProjectCategory;
  description: string;
  /** Photograph — or, for a video project, its poster frame */
  image: Img;
  /** Optional short video (muted autoplay preview in the grid, full playback in the viewer) */
  video?: string;
  /** Visual size in the gallery grid */
  size: TileSize;
  /** Optional CSS object-position, to keep the important part of a cropped photo in view */
  focus?: string;
  visible: boolean;
};

export type Testimonial = { id: number; quote: string; name: string; detail?: string; visible: boolean };

/** Small slice of the catalogue that client components (menu, WhatsApp button) need. */
export type CatalogueIndex = { slug: string; name: string; products: { slug: string; name: string }[] }[];

// Seed shapes (the original hard-coded content, copied into the database on first run)
export type SeedProduct = Omit<Product, "id" | "visible">;
export type SeedCategory = Omit<Category, "id" | "visible" | "products"> & { products: SeedProduct[] };
export type SeedProject = Omit<Project, "id" | "visible"> & { id: string };
export type SeedTestimonial = Omit<Testimonial, "id" | "visible">;
