import "server-only";
import { getEnv } from "./db";

/** Uploaded media lives in Workers KV and is served from /media/<key>. */
export const MEDIA_PREFIX = "/media/";
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 24 * 1024 * 1024; // KV values are limited to 25 MiB

/** Identifies the real file type from its first bytes (never trusts the file name or browser). */
export function sniffMedia(buf: Uint8Array): { type: string; ext: string; kind: "image" | "video" } | null {
  const ascii = (a: number, b: number) => String.fromCharCode(...buf.subarray(a, b));
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { type: "image/jpeg", ext: "jpg", kind: "image" };
  if (buf[0] === 0x89 && ascii(1, 4) === "PNG") return { type: "image/png", ext: "png", kind: "image" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { type: "image/webp", ext: "webp", kind: "image" };
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (brand === "qt  ") return { type: "video/quicktime", ext: "mov", kind: "video" };
    return { type: "video/mp4", ext: "mp4", kind: "video" };
  }
  return null;
}

export const isUploadedMedia = (src: string | null | undefined): src is string => !!src && src.startsWith(MEDIA_PREFIX);

/** Removes uploaded files from storage (ignores static /images and /videos paths). */
export async function deleteMedia(srcs: (string | null | undefined)[]) {
  const env = await getEnv();
  if (!env) return;
  await Promise.all(
    srcs.filter(isUploadedMedia).map((src) => env.MEDIA.delete(decodeURIComponent(src.slice(MEDIA_PREFIX.length))).catch(() => {}))
  );
}
