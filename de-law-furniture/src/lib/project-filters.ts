import type { ProjectCategory } from "./types";

export const projectFilters: { id: "all" | ProjectCategory; label: string }[] = [
  { id: "all", label: "All Work" },
  { id: "sofas", label: "Sofas & Seating" },
  { id: "bedroom", label: "Beds" },
  { id: "wardrobes", label: "Wardrobes" },
  { id: "tv", label: "TV Units" },
  { id: "tables", label: "Tables" },
  { id: "kitchen", label: "Kitchens" },
  { id: "dining", label: "Dining" },
  { id: "office", label: "Offices" },
  { id: "windows", label: "Blinds & Curtains" },
];

export type ProjectFilter = (typeof projectFilters)[number]["id"];

export const projectCategories = projectFilters.filter((f) => f.id !== "all") as { id: ProjectCategory; label: string }[];

export const labelOfFilter = (id: string) => projectFilters.find((f) => f.id === id)?.label ?? id;
