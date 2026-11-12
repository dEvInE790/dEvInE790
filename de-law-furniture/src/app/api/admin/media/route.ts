import { NextResponse } from "next/server";
import { isAdmin, sameOrigin } from "@/lib/auth";
import { getEnv } from "@/lib/db";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, MEDIA_PREFIX, sniffMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

/** Admin upload of one photo or video. Returns { src } to store on a project/product. */
export async function POST(req: Request) {
  if (!(await sameOrigin()) || !(await isAdmin())) return NextResponse.json({ ok: false, message: "Please sign in again." }, { status: 401 });
  const env = await getEnv();
  if (!env) return NextResponse.json({ ok: false, message: "Media storage is not available here." }, { status: 503 });

  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ ok: false, message: "No file received." }, { status: 400 });

  const buf = new Uint8Array(await file.arrayBuffer());
  const kind = sniffMedia(buf);
  if (!kind) return NextResponse.json({ ok: false, message: "Please upload a JPEG, PNG or WebP photo, or an MP4 video." }, { status: 415 });
  const limit = kind.kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (buf.byteLength > limit) {
    return NextResponse.json({ ok: false, message: `That ${kind.kind} is too large (max ${Math.round(limit / 1024 / 1024)} MB).` }, { status: 413 });
  }

  const d = new Date();
  const key = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${kind.ext}`;
  await env.MEDIA.put(key, buf, { metadata: { type: kind.type, size: buf.byteLength } });
  return NextResponse.json({ ok: true, src: `${MEDIA_PREFIX}${key}`, kind: kind.kind });
}
