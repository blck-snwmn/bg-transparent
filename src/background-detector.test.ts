import { describe, test, expect } from "vitest";
import {
  getPixelAt,
  colorDistance,
  detectBackgroundColor,
  rgbToHex,
} from "./background-detector";
import type { RGB, ImageInfo } from "./types";

describe("getPixelAt", () => {
  test("should get pixel at (0, 0)", () => {
    // 3x3 RGB image
    const data = Buffer.from([
      255, 0, 0, // (0, 0) red
      0, 255, 0, // (1, 0) green
      0, 0, 255, // (2, 0) blue
      100, 100, 100, // (0, 1)
      150, 150, 150, // (1, 1)
      200, 200, 200, // (2, 1)
      50, 50, 50, // (0, 2)
      75, 75, 75, // (1, 2)
      25, 25, 25, // (2, 2)
    ]);
    const info: ImageInfo = { width: 3, height: 3, channels: 3 };

    expect(getPixelAt(data, 0, 0, info)).toEqual({ r: 255, g: 0, b: 0 });
    expect(getPixelAt(data, 1, 0, info)).toEqual({ r: 0, g: 255, b: 0 });
    expect(getPixelAt(data, 2, 0, info)).toEqual({ r: 0, g: 0, b: 255 });
    expect(getPixelAt(data, 0, 1, info)).toEqual({ r: 100, g: 100, b: 100 });
    expect(getPixelAt(data, 1, 1, info)).toEqual({ r: 150, g: 150, b: 150 });
  });

  test("should handle RGBA image", () => {
    // 2x2 RGBA image
    const data = Buffer.from([
      255, 0, 0, 255, // (0, 0) red
      0, 255, 0, 128, // (1, 0) green
      0, 0, 255, 64, // (0, 1) blue
      255, 255, 255, 0, // (1, 1) white
    ]);
    const info: ImageInfo = { width: 2, height: 2, channels: 4 };

    expect(getPixelAt(data, 0, 0, info)).toEqual({ r: 255, g: 0, b: 0 });
    expect(getPixelAt(data, 1, 0, info)).toEqual({ r: 0, g: 255, b: 0 });
    expect(getPixelAt(data, 0, 1, info)).toEqual({ r: 0, g: 0, b: 255 });
    expect(getPixelAt(data, 1, 1, info)).toEqual({ r: 255, g: 255, b: 255 });
  });
});

describe("colorDistance", () => {
  test("should return 0 for same colors", () => {
    const color: RGB = { r: 128, g: 128, b: 128 };
    expect(colorDistance(color, color)).toBe(0);
  });

  test("should calculate distance between black and white", () => {
    const black: RGB = { r: 0, g: 0, b: 0 };
    const white: RGB = { r: 255, g: 255, b: 255 };
    // sqrt(255^2 + 255^2 + 255^2) = sqrt(195075) ≈ 441.67
    expect(colorDistance(black, white)).toBeCloseTo(441.67, 1);
  });

  test("should calculate distance between red and blue", () => {
    const red: RGB = { r: 255, g: 0, b: 0 };
    const blue: RGB = { r: 0, g: 0, b: 255 };
    // sqrt(255^2 + 0 + 255^2) = sqrt(130050) ≈ 360.62
    expect(colorDistance(red, blue)).toBeCloseTo(360.62, 1);
  });

  test("should be commutative", () => {
    const c1: RGB = { r: 100, g: 50, b: 200 };
    const c2: RGB = { r: 50, g: 100, b: 150 };
    expect(colorDistance(c1, c2)).toBe(colorDistance(c2, c1));
  });
});

describe("detectBackgroundColor", () => {
  test("should detect solid background color", () => {
    // 10x10 image with white background and some colored pixels in center
    const width = 10;
    const height = 10;
    const data = Buffer.alloc(width * height * 3, 255); // All white

    // Add some red pixels in the center (won't affect corner/edge detection)
    for (let y = 3; y < 7; y++) {
      for (let x = 3; x < 7; x++) {
        const idx = (y * width + x) * 3;
        data[idx] = 255; // R
        data[idx + 1] = 0; // G
        data[idx + 2] = 0; // B
      }
    }

    const info: ImageInfo = { width, height, channels: 3 };
    const bgColor = detectBackgroundColor(data, info);

    // Should detect white as background
    expect(bgColor.r).toBe(255);
    expect(bgColor.g).toBe(255);
    expect(bgColor.b).toBe(255);
  });

  test("should handle mostly uniform background with some variance", () => {
    // 10x10 image with slightly varying gray background
    const width = 10;
    const height = 10;
    const data = Buffer.alloc(width * height * 3);

    // Fill with gray values around 200
    for (let i = 0; i < width * height; i++) {
      const value = 195 + (i % 10); // Values from 195 to 204
      data[i * 3] = value;
      data[i * 3 + 1] = value;
      data[i * 3 + 2] = value;
    }

    const info: ImageInfo = { width, height, channels: 3 };
    const bgColor = detectBackgroundColor(data, info);

    // Should detect gray as background (average of sampled corners/edges)
    expect(bgColor.r).toBeGreaterThan(190);
    expect(bgColor.r).toBeLessThan(210);
  });
});

describe("rgbToHex", () => {
  test("should convert black to #000000", () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
  });

  test("should convert white to #FFFFFF", () => {
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe("#FFFFFF");
  });

  test("should convert red to #FF0000", () => {
    expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe("#FF0000");
  });

  test("should convert green to #00FF00", () => {
    expect(rgbToHex({ r: 0, g: 255, b: 0 })).toBe("#00FF00");
  });

  test("should convert blue to #0000FF", () => {
    expect(rgbToHex({ r: 0, g: 0, b: 255 })).toBe("#0000FF");
  });

  test("should handle arbitrary colors", () => {
    expect(rgbToHex({ r: 171, g: 205, b: 239 })).toBe("#ABCDEF");
    expect(rgbToHex({ r: 18, g: 52, b: 86 })).toBe("#123456");
  });

  test("should pad single digit hex values", () => {
    expect(rgbToHex({ r: 1, g: 2, b: 3 })).toBe("#010203");
    expect(rgbToHex({ r: 15, g: 15, b: 15 })).toBe("#0F0F0F");
  });
});
