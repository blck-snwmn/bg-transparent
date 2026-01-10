import type { BoundingBox } from "./types";

/**
 * Find the bounding box of non-transparent pixels in RGBA image data
 * @param data - Raw RGBA image buffer
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param alphaThreshold - Minimum alpha value to consider a pixel non-transparent (default: 10)
 * @returns Bounding box containing all non-transparent pixels
 */
export function findBoundingBox(
  data: Buffer,
  width: number,
  height: number,
  alphaThreshold: number = 10
): BoundingBox {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3] ?? 0;

      if (alpha > alphaThreshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // Handle case where no non-transparent pixels found
  if (minX > maxX || minY > maxY) {
    return { x: 0, y: 0, width, height };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}
