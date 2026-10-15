#!/usr/bin/env python3
"""Build web-ready photos from the originals in assets/img/source/.

For every source photo this writes two progressive JPEGs to
assets/img/projects/:

  <name>.jpg      full size for the lightbox (max 1280px on the long edge)
  <name>-sm.jpg   600px-wide version for cards and the gallery grid

It also builds assets/img/og-image.jpg (1200x630), the preview shown when
the link is shared on WhatsApp or social media.

Run from the repo root after adding or replacing a photo:

    python3 scripts/optimize_images.py

Requires Pillow (pip install Pillow).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets/img/source"
OUT = ROOT / "assets/img/projects"
OG_PHOTO = "tv-wall-charcoal"

FULL_MAX = 1280
SMALL_WIDTH = 600
QUALITY = 72


def trim_dark_edges(im, threshold=60):
    """Remove solid black bars some phone screenshots add at the sides."""
    gray = im.convert("L")
    w, h = gray.size

    def col_mean(x):
        return sum(gray.crop((x, 0, x + 1, h)).tobytes()) / h

    def row_mean(y):
        return sum(gray.crop((0, y, w, y + 1)).tobytes()) / w

    left, right, top, bottom = 0, w, 0, h
    while left < w // 4 and col_mean(left) < threshold:
        left += 1
    while right > w * 3 // 4 and col_mean(right - 1) < threshold:
        right -= 1
    while top < h // 4 and row_mean(top) < threshold:
        top += 1
    while bottom > h * 3 // 4 and row_mean(bottom - 1) < threshold:
        bottom -= 1
    return im.crop((left, top, right, bottom))


def save(im, path):
    im.save(path, "JPEG", quality=QUALITY, optimize=True, progressive=True)


def build_og_image(photo):
    w, h = 1200, 630
    charcoal = (36, 31, 27)
    canvas = Image.new("RGB", (w, h), charcoal)

    panel = ImageOps.fit(photo, (520, h), centering=(0.5, 0.5))
    canvas.paste(panel, (w - 520, 0))

    draw = ImageDraw.Draw(canvas)
    fonts = "/usr/share/fonts/truetype/dejavu/"
    try:
        title = ImageFont.truetype(fonts + "DejaVuSans-Bold.ttf", 46)
        body = ImageFont.truetype(fonts + "DejaVuSans.ttf", 28)
    except OSError:
        title = body = ImageFont.load_default()

    draw.rectangle((70, 200, 130, 204), fill=(176, 125, 79))
    draw.text((70, 230), "Simple Interior Tech", font=title, fill=(247, 243, 238))
    draw.text((70, 310), "Bespoke furniture & joinery,", font=body, fill=(214, 204, 192))
    draw.text((70, 350), "built to fit your space.", font=body, fill=(214, 204, 192))
    save(canvas, ROOT / "assets/img/og-image.jpg")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for src in sorted(SOURCE.glob("*.jpg")):
        im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        im = trim_dark_edges(im)

        full = im.copy()
        full.thumbnail((FULL_MAX, FULL_MAX), Image.LANCZOS)
        dest = OUT / f"{src.stem}.jpg"
        save(full, dest)
        # Re-encoding an already-compressed phone photo can make it bigger;
        # keep the original bytes when nothing was cropped or resized.
        if full.size == Image.open(src).size and src.stat().st_size < dest.stat().st_size:
            dest.write_bytes(src.read_bytes())

        small = im.copy()
        if small.width > SMALL_WIDTH:
            ratio = SMALL_WIDTH / small.width
            small = small.resize((SMALL_WIDTH, round(small.height * ratio)), Image.LANCZOS)
        save(small, OUT / f"{src.stem}-sm.jpg")

        print(f"{src.name}: full {full.size}, small {small.size}")
        if src.stem == OG_PHOTO:
            build_og_image(im)


if __name__ == "__main__":
    main()
