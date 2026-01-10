import type { RGB, ImageInfo } from "./types";
import { colorDistance } from "./background-detector";

/**
 * Make background pixels transparent based on color distance from background color
 * @param data - Raw image buffer (RGB or RGBA)
 * @param info - Image metadata
 * @param bgColor - Background color to make transparent
 * @param tolerance - Color distance tolerance (0-255). Pixels within tolerance are fully transparent,
 *                    pixels within 2x tolerance have gradient transparency for anti-aliasing
 * @returns RGBA buffer with transparent background
 */
export function makeTransparent(
  data: Buffer,
  info: ImageInfo,
  bgColor: RGB,
  tolerance: number
): Buffer {
  const { width, height, channels } = info;
  const pixelCount = width * height;

  // Output is always RGBA (4 channels)
  const result = Buffer.alloc(pixelCount * 4);

  for (let i = 0; i < pixelCount; i++) {
    const srcIdx = i * channels;
    const dstIdx = i * 4;

    const pixel: RGB = {
      r: data[srcIdx] ?? 0,
      g: data[srcIdx + 1] ?? 0,
      b: data[srcIdx + 2] ?? 0,
    };

    const distance = colorDistance(pixel, bgColor);

    // Copy RGB values
    result[dstIdx] = pixel.r;
    result[dstIdx + 1] = pixel.g;
    result[dstIdx + 2] = pixel.b;

    // Set alpha based on distance from background
    if (distance <= tolerance) {
      // Fully transparent
      result[dstIdx + 3] = 0;
    } else if (distance <= tolerance * 2) {
      // Gradient transparency for anti-aliasing
      const alpha = Math.floor(((distance - tolerance) / tolerance) * 255);
      result[dstIdx + 3] = Math.min(255, alpha);
    } else {
      // Fully opaque
      result[dstIdx + 3] = 255;
    }
  }

  return result;
}
