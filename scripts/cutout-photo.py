"""
Turn a studio portrait into a transparent cut-out for the welcome dialog.

The studio backdrop is a flat, pale gradient, so the background can be lifted by
flood filling inward from the edges: every pixel that is both close in colour to
its neighbours and reachable from the border becomes transparent. Anything
enclosed by the subject (between an arm and the body, say) is left alone unless
it is reachable from outside, which keeps the person intact.

Usage:
    python scripts/cutout-photo.py <input> [output] [--tolerance 32]

Example:
    python scripts/cutout-photo.py ~/Downloads/andreas.jpg public/images/founder.png
"""

from __future__ import annotations

import argparse
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def build_background_mask(pixels: np.ndarray, tolerance: int) -> np.ndarray:
    """Flood fill from every border pixel, returning True where the backdrop is."""
    height, width = pixels.shape[:2]
    rgb = pixels[:, :, :3].astype(np.int16)

    is_background = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    # Seed from the whole border - the subject never touches all four edges.
    for x in range(width):
        for y in (0, height - 1):
            if not is_background[y, x]:
                is_background[y, x] = True
                queue.append((y, x))

    for y in range(height):
        for x in (0, width - 1):
            if not is_background[y, x]:
                is_background[y, x] = True
                queue.append((y, x))

    while queue:
        y, x = queue.popleft()
        here = rgb[y, x]

        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx

            if not (0 <= ny < height and 0 <= nx < width) or is_background[ny, nx]:
                continue

            # Compare against the pixel we spread from, so a gentle gradient is
            # followed while a hard edge (the subject) stops the fill.
            if int(np.abs(rgb[ny, nx] - here).max()) <= tolerance:
                is_background[ny, nx] = True
                queue.append((ny, nx))

    return is_background


def cutout(source: Path, target: Path, tolerance: int) -> None:
    image = Image.open(source).convert("RGBA")
    pixels = np.array(image)

    background = build_background_mask(pixels, tolerance)

    alpha = np.where(background, 0, 255).astype(np.uint8)
    pixels[:, :, 3] = alpha

    result = Image.fromarray(pixels)

    # Feather the edge by a hair so the cut does not look like scissors work.
    softened = result.split()[3].filter(ImageFilter.GaussianBlur(0.8))
    result.putalpha(softened)

    # Trim the empty margin so the photo can be positioned by its own bounds.
    bounds = result.getbbox()
    if bounds is not None:
        result = result.crop(bounds)

    target.parent.mkdir(parents=True, exist_ok=True)
    result.save(target, "PNG", optimize=True)

    kept = int((alpha > 0).sum())
    total = alpha.size
    print(f"Saved {target} ({result.width}x{result.height}), kept {kept / total:.0%} of the pixels.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path, nargs="?", default=Path("public/images/founder.png"))
    parser.add_argument("--tolerance", type=int, default=32, help="higher removes more, risks eating the subject")
    args = parser.parse_args()

    if not args.input.exists():
        print(f"Cannot find {args.input}", file=sys.stderr)

        return 1

    cutout(args.input, args.output, args.tolerance)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
