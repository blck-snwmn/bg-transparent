import type { RGB, ImageInfo } from "./types";

/**
 * Get RGB color of a pixel at specified coordinates
 * @param data - Raw image buffer
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param info - Image metadata (width, height, channels)
 * @returns RGB color at the specified position
 */
export function getPixelAt(data: Buffer, x: number, y: number, info: ImageInfo): RGB {
  const idx = (y * info.width + x) * info.channels;
  return {
    r: data[idx] ?? 0,
    g: data[idx + 1] ?? 0,
    b: data[idx + 2] ?? 0,
  };
}

/**
 * Calculate Euclidean distance between two RGB colors
 * @param c1 - First RGB color
 * @param c2 - Second RGB color
 * @returns Distance value (0-441.67 for RGB space)
 */
export function colorDistance(c1: RGB, c2: RGB): number {
  return Math.sqrt(
    (c1.r - c2.r) ** 2 +
    (c1.g - c2.g) ** 2 +
    (c1.b - c2.b) ** 2
  );
}

/**
 * Calculate average color from an array of RGB colors
 * @param colors - Array of RGB colors
 * @returns Average RGB color
 */
function averageColor(colors: RGB[]): RGB {
  const sum = colors.reduce(
    (acc, c) => ({
      r: acc.r + c.r,
      g: acc.g + c.g,
      b: acc.b + c.b,
    }),
    { r: 0, g: 0, b: 0 }
  );
  return {
    r: Math.round(sum.r / colors.length),
    g: Math.round(sum.g / colors.length),
    b: Math.round(sum.b / colors.length),
  };
}

/**
 * Find the largest group of similar colors within threshold
 * @param colors - Array of RGB colors to analyze
 * @param threshold - Maximum color distance to consider similar (default: 50)
 * @returns Array of similar colors
 */
function findSimilarColors(colors: RGB[], threshold: number = 50): RGB[] {
  // Find the largest group of similar colors
  let bestGroup: RGB[] = [];

  for (let i = 0; i < colors.length; i++) {
    const baseColor = colors[i]!;
    const group: RGB[] = [baseColor];
    for (let j = 0; j < colors.length; j++) {
      const compareColor = colors[j]!;
      if (i !== j && colorDistance(baseColor, compareColor) <= threshold) {
        group.push(compareColor);
      }
    }
    if (group.length > bestGroup.length) {
      bestGroup = group;
    }
  }

  return bestGroup.length > 0 ? bestGroup : colors;
}

/**
 * Detect background color by sampling corners and edge midpoints
 * @param data - Raw image buffer
 * @param info - Image metadata
 * @returns Detected background RGB color
 */
export function detectBackgroundColor(data: Buffer, info: ImageInfo): RGB {
  const { width, height } = info;

  // Sample corners and edges
  const samples: RGB[] = [
    // Four corners
    getPixelAt(data, 0, 0, info),
    getPixelAt(data, width - 1, 0, info),
    getPixelAt(data, 0, height - 1, info),
    getPixelAt(data, width - 1, height - 1, info),
    // Edge midpoints
    getPixelAt(data, Math.floor(width / 2), 0, info),
    getPixelAt(data, Math.floor(width / 2), height - 1, info),
    getPixelAt(data, 0, Math.floor(height / 2), info),
    getPixelAt(data, width - 1, Math.floor(height / 2), info),
  ];

  // Find similar colors and average them
  const similarColors = findSimilarColors(samples);
  return averageColor(similarColors);
}

/**
 * Convert RGB color to hex string
 * @param color - RGB color object
 * @returns Hex color string (e.g., "#FFFFFF")
 */
export function rgbToHex(color: RGB): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`.toUpperCase();
}
