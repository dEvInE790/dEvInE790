/**
 * Optional real photography. Drop files into /public/media and set the paths
 * here — every slot falls back to the built-in animated artwork when null.
 */
export const MEDIA: {
  heroImage: string | null;
  expect: Record<"drinks" | "music" | "games" | "performances" | "more", string | null>;
  sponsors: { tribewave: string | null; motionboys: string | null };
} = {
  heroImage: null, // e.g. "/media/hero.jpg"
  expect: { drinks: null, music: null, games: null, performances: null, more: null },
  sponsors: { tribewave: null, motionboys: null }, // e.g. "/sponsors/tribewave.png"
};
