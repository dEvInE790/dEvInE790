/**
 * Next.js image loader that needs no image server, so it works on any host
 * (Cloudflare Workers, Vercel, static hosting):
 *  - Unsplash photos are resized and compressed by Unsplash's own CDN.
 *  - The company's own photos in /public/images are served as they are,
 *    so export them at a sensible size (about 2400px wide for the hero,
 *    1600px for other photos) before adding them.
 */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality || 75));
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "crop");
    return url.toString();
  }
  return src;
}
