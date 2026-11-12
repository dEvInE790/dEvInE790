import { USING_PLACEHOLDER_PHOTOS } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Discreet, honest note shown while portfolio photographs are still representative stock images. */
export function PlaceholderNote({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  if (!USING_PLACEHOLDER_PHOTOS) return null;
  return (
    <p className={cn("text-xs italic", tone === "dark" ? "text-ivory/45" : "text-taupe/80", className)}>
      Photography shown is representative. Our project gallery is being updated with photographs of completed DE. LAW installations.
    </p>
  );
}
