import { getEnv } from "@/lib/db";

export const dynamic = "force-dynamic";

type Meta = { type?: string; size?: number };

/**
 * Serves uploaded photos and videos from Workers KV. Supports HTTP Range
 * requests, which browsers (Safari in particular) need to play video.
 */
async function serve(req: Request, params: Promise<{ key: string[] }>, headOnly: boolean) {
  const { key } = await params;
  const env = await getEnv();
  if (!env) return new Response("Not found", { status: 404 });
  const k = key.map(decodeURIComponent).join("/");
  if (!/^[\w\-/.]+$/.test(k) || k.includes("..")) return new Response("Not found", { status: 404 });

  const { value, metadata } = await env.MEDIA.getWithMetadata<Meta>(k, "arrayBuffer");
  if (!value) return new Response("Not found", { status: 404 });
  const total = value.byteLength;
  const base: Record<string, string> = {
    "Content-Type": metadata?.type || "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
    ETag: `"${k}"`,
    "X-Content-Type-Options": "nosniff",
  };

  const range = req.headers.get("range");
  const m = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (m && (m[1] || m[2])) {
    let start = m[1] ? Number(m[1]) : Math.max(0, total - Number(m[2]));
    let end = m[1] && m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
    if (!m[1]) end = total - 1;
    if (start >= total || start > end) {
      return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${total}` } });
    }
    start = Math.max(0, start);
    return new Response(headOnly ? null : value.slice(start, end + 1), {
      status: 206,
      headers: { ...base, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(headOnly ? null : value, { headers: { ...base, "Content-Length": String(total) } });
}

export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  return serve(req, params, false);
}

export async function HEAD(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  return serve(req, params, true);
}
