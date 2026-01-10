import { describe, test, expect } from "vitest";
import { makeTransparent } from "./transparent";
import type { RGB, ImageInfo } from "./types";

describe("makeTransparent", () => {
  test("should make exact background color fully transparent", () => {
    // 2x2 RGB image: white background with one red pixel
    const data = Buffer.from([
      255, 255, 255, // (0, 0) white
      255, 0, 0, // (1, 0) red
      255, 255, 255, // (0, 1) white
      255, 255, 255, // (1, 1) white
    ]);
    const info: ImageInfo = { width: 2, height: 2, channels: 3 };
    const bgColor: RGB = { r: 255, g: 255, b: 255 };

    const result = makeTransparent(data, info, bgColor, 0);

    // Result should be RGBA (4 channels)
    expect(result.length).toBe(2 * 2 * 4);

    // (0, 0) white -> transparent
    expect(result[0]).toBe(255); // R
    expect(result[1]).toBe(255); // G
    expect(result[2]).toBe(255); // B
    expect(result[3]).toBe(0); // A (transparent)

    // (1, 0) red -> opaque
    expect(result[4]).toBe(255); // R
    expect(result[5]).toBe(0); // G
    expect(result[6]).toBe(0); // B
    expect(result[7]).toBe(255); // A (opaque)
  });

  test("should apply tolerance for near-background colors", () => {
    // 2x2 RGB image with colors near white
    const data = Buffer.from([
      255, 255, 255, // exact white
      250, 250, 250, // near white (distance ~8.66)
      240, 240, 240, // further from white (distance ~26)
      200, 200, 200, // much further (distance ~95)
    ]);
    const info: ImageInfo = { width: 2, height: 2, channels: 3 };
    const bgColor: RGB = { r: 255, g: 255, b: 255 };
    const tolerance = 10;

    const result = makeTransparent(data, info, bgColor, tolerance);

    // (0, 0) exact white -> fully transparent
    expect(result[3]).toBe(0);

    // (1, 0) near white within tolerance -> fully transparent
    expect(result[7]).toBe(0);

    // (0, 1) 240,240,240 - distance ~26, within 2x tolerance -> semi-transparent
    // distance = sqrt(3 * 15^2) = 25.98
    // alpha = ((25.98 - 10) / 10) * 255 ≈ 408, capped at 255
    expect(result[11]).toBeGreaterThan(0);

    // (1, 1) 200,200,200 - distance ~95, beyond 2x tolerance -> fully opaque
    // distance = sqrt(3 * 55^2) = 95.26
    expect(result[15]).toBe(255);
  });

  test("should handle RGBA input", () => {
    // 2x2 RGBA image
    const data = Buffer.from([
      255, 255, 255, 255, // white opaque
      255, 0, 0, 128, // red semi-transparent
      0, 255, 0, 255, // green opaque
      0, 0, 255, 64, // blue mostly transparent
    ]);
    const info: ImageInfo = { width: 2, height: 2, channels: 4 };
    const bgColor: RGB = { r: 255, g: 255, b: 255 };

    const result = makeTransparent(data, info, bgColor, 10);

    // Result should still be 4 channels
    expect(result.length).toBe(2 * 2 * 4);

    // White pixel should be transparent
    expect(result[3]).toBe(0);

    // Non-white pixels should be opaque (based on color distance, not original alpha)
    expect(result[7]).toBe(255); // red
    expect(result[11]).toBe(255); // green
    expect(result[15]).toBe(255); // blue
  });

  test("should return all transparent for solid color image matching background", () => {
    // 3x3 solid white image
    const data = Buffer.alloc(3 * 3 * 3, 255);
    const info: ImageInfo = { width: 3, height: 3, channels: 3 };
    const bgColor: RGB = { r: 255, g: 255, b: 255 };

    const result = makeTransparent(data, info, bgColor, 0);

    // All pixels should be transparent
    for (let i = 0; i < 9; i++) {
      expect(result[i * 4 + 3]).toBe(0); // alpha channel
    }
  });

  test("should preserve RGB values while modifying alpha", () => {
    const data = Buffer.from([
      100, 150, 200, // some color
    ]);
    const info: ImageInfo = { width: 1, height: 1, channels: 3 };
    const bgColor: RGB = { r: 100, g: 150, b: 200 }; // same as pixel

    const result = makeTransparent(data, info, bgColor, 0);

    // RGB should be preserved
    expect(result[0]).toBe(100);
    expect(result[1]).toBe(150);
    expect(result[2]).toBe(200);
    // Alpha should be 0 (transparent)
    expect(result[3]).toBe(0);
  });

  test("should handle gradient transparency for anti-aliasing", () => {
    // Create colors at various distances from background
    const bgColor: RGB = { r: 128, g: 128, b: 128 };
    const tolerance = 20;

    // Color at distance = tolerance (boundary)
    // distance = 20 -> alpha = 0 (fully transparent)
    const atTolerance = Buffer.from([148, 128, 128]); // distance = 20
    const info1: ImageInfo = { width: 1, height: 1, channels: 3 };
    const result1 = makeTransparent(atTolerance, info1, bgColor, tolerance);
    expect(result1[3]).toBe(0);

    // Color at distance = 1.5 * tolerance
    // distance = 30 -> alpha = ((30 - 20) / 20) * 255 = 127
    const at1_5Tolerance = Buffer.from([128, 128, 128 + 30]); // distance ≈ 30
    const result2 = makeTransparent(at1_5Tolerance, info1, bgColor, tolerance);
    expect(result2[3]).toBeGreaterThan(100);
    expect(result2[3]).toBeLessThan(150);

    // Color at distance > 2 * tolerance
    // distance = 50 -> alpha = 255 (fully opaque)
    const beyondTolerance = Buffer.from([128, 128, 178]); // distance = 50
    const result3 = makeTransparent(beyondTolerance, info1, bgColor, tolerance);
    expect(result3[3]).toBe(255);
  });
});
