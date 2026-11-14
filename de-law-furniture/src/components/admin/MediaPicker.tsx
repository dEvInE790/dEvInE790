"use client";

import { useRef, useState } from "react";
import { Film, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { compressImage } from "@/components/forms/useEnquiry";
import { btn } from "./styles";
import { useAdmin } from "./AdminApp";
import { MAX_VIDEO_BYTES } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

/** Grabs a frame ~1s into a video in the browser, to use as its poster image. */
async function posterFromVideo(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("This video format can't be read by the browser. Please use an MP4 video."));
    });
    video.currentTime = Math.min(1, (video.duration || 2) / 2);
    await new Promise<void>((resolve) => (video.onseeked = () => resolve()));
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) throw new Error("Couldn't create a preview image for this video.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

type Props = {
  /** "image": photo only. "image-or-video": a photo, or a video (a poster photo is generated automatically). */
  mode?: "image" | "image-or-video";
  image?: string;
  video?: string;
  onChange: (v: { image: string; video?: string }) => void;
  onClear?: () => void;
  className?: string;
};

export function MediaPicker({ mode = "image", image, video, onChange, onClear, className }: Props) {
  const { api } = useAdmin();
  const upload = api.uploadMedia;
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      if (file.type.startsWith("video/")) {
        if (mode !== "image-or-video") throw new Error("Please choose a photo.");
        if (file.size > MAX_VIDEO_BYTES) throw new Error("Videos must be under 50 MB. Try a shorter clip.");
        setBusy("Preparing video…");
        const poster = await posterFromVideo(file);
        setBusy("Uploading video…");
        const [videoSrc, posterSrc] = await Promise.all([upload(file, file.name), upload(poster, "poster.jpg")]);
        onChange({ image: posterSrc, video: videoSrc });
      } else {
        setBusy("Uploading photo…");
        const small = await compressImage(file, 2000, 0.85).catch(() => {
          throw new Error("This photo couldn't be read. Please use a JPEG or PNG.");
        });
        onChange({ image: await upload(small, small.name) });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative flex aspect-[4/3] w-full max-w-sm items-center justify-center overflow-hidden border border-dashed border-espresso/25 bg-cream/50">
        {video ? (
          <video src={video} poster={image} controls playsInline className="h-full w-full object-cover" />
        ) : image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 text-xs text-taupe">
            {mode === "image-or-video" ? <Film className="h-6 w-6" /> : <ImagePlus className="h-6 w-6" />}
            No {mode === "image-or-video" ? "photo or video" : "photo"} yet
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center gap-2 bg-white/80 text-sm text-espresso">
            <Loader2 className="h-4 w-4 animate-spin" /> {busy}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn.secondary} disabled={!!busy} onClick={() => input.current?.click()}>
          <ImagePlus className="h-4 w-4" /> {image ? "Replace" : "Upload"} {mode === "image-or-video" ? "photo / video" : "photo"}
        </button>
        {onClear && image && (
          <button type="button" className={btn.danger} disabled={!!busy} onClick={onClear}>
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        )}
      </div>
      {mode === "image-or-video" && <p className="text-xs text-taupe">Photos: JPEG/PNG. Videos: MP4 up to 50 MB (WhatsApp videos work well).</p>}
      {error && <p role="alert" className="text-sm text-[#a4442e]">{error}</p>}
      <input
        ref={input}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        accept={mode === "image-or-video" ? "image/*,video/mp4,video/quicktime" : "image/*"}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
