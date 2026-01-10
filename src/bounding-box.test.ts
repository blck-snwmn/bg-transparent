import { describe, test, expect } from "vitest";
import { findBoundingBox } from "./bounding-box";

describe("findBoundingBox", () => {
  test("should find bounding box of non-transparent pixels (rectangular image)", () => {
    // 8x5 RGBA image (wider than tall)
    // Layout (A = alpha > 0, . = transparent):
    // . . . . . . . .
    // . . A A . . . .
    // . . A A A . . .
    // . . . . . . . .
    // . . . . . . . .
    const width = 8;
    const height = 5;
    const data = Buffer.alloc(width * height * 4, 0);

    // Set non-transparent pixels at (2,1), (3,1), (2,2), (3,2), (4,2)
    const setPixel = (x: number, y: number, alpha: number) => {
      const idx = (y * width + x) * 4;
      data[idx] = 255; // R
      data[idx + 1] = 0; // G
      data[idx + 2] = 0; // B
      data[idx + 3] = alpha;
    };

    setPixel(2, 1, 255);
    setPixel(3, 1, 255);
    setPixel(2, 2, 255);
    setPixel(3, 2, 255);
    setPixel(4, 2, 255);

    const bbox = findBoundingBox(data, width, height);

    expect(bbox).toEqual({
      x: 2,
      y: 1,
      width: 3, // from x=2 to x=4
      height: 2, // from y=1 to y=2
    });
  });

  test("should handle tall rectangular image", () => {
    // 4x10 RGBA image (taller than wide)
    const width = 4;
    const height = 10;
    const data = Buffer.alloc(width * height * 4, 0);

    // Set pixels at (1,3), (1,4), (2,4), (2,5)
    const setPixel = (x: number, y: number) => {
      const idx = (y * width + x) * 4;
      data[idx + 3] = 255; // alpha
    };

    setPixel(1, 3);
    setPixel(1, 4);
    setPixel(2, 4);
    setPixel(2, 5);

    const bbox = findBoundingBox(data, width, height);

    expect(bbox).toEqual({
      x: 1,
      y: 3,
      width: 2, // from x=1 to x=2
      height: 3, // from y=3 to y=5
    });
  });

  test("should return full image dimensions when no transparent pixels", () => {
    // 6x4 fully opaque image
    const width = 6;
    const height = 4;
    const data = Buffer.alloc(width * height * 4);

    // Fill with opaque pixels
    for (let i = 0; i < width * height; i++) {
      data[i * 4 + 3] = 255;
    }

    const bbox = findBoundingBox(data, width, height);

    expect(bbox).toEqual({
      x: 0,
      y: 0,
      width: 6,
      height: 4,
    });
  });

  test("should return full image dimensions when all pixels are transparent", () => {
    // 5x3 fully transparent image
    const width = 5;
    const height = 3;
    const data = Buffer.alloc(width * height * 4, 0);

    const bbox = findBoundingBox(data, width, height);

    expect(bbox).toEqual({
      x: 0,
      y: 0,
      width: 5,
      height: 3,
    });
  });

  test("should handle single non-transparent pixel", () => {
    // 10x6 image with single pixel
    const width = 10;
    const height = 6;
    const data = Buffer.alloc(width * height * 4, 0);

    // Set single pixel at (7, 4)
    const idx = (4 * width + 7) * 4;
    data[idx + 3] = 255;

    const bbox = findBoundingBox(data, width, height);

    expect(bbox).toEqual({
      x: 7,
      y: 4,
      width: 1,
      height: 1,
    });
  });

  test("should respect alpha threshold", () => {
    // 6x4 image with varying alpha values
    const width = 6;
    const height = 4;
    const data = Buffer.alloc(width * height * 4, 0);

    // Set pixels with different alpha values
    const setPixelAlpha = (x: number, y: number, alpha: number) => {
      const idx = (y * width + x) * 4;
      data[idx] = 255;
      data[idx + 3] = alpha;
    };

    setPixelAlpha(0, 0, 5); // below threshold
    setPixelAlpha(5, 3, 5); // below threshold
    setPixelAlpha(2, 1, 50); // above threshold
    setPixelAlpha(4, 2, 100); // above threshold

    const bbox = findBoundingBox(data, width, height, 10);

    // Should only include pixels with alpha > 10
    expect(bbox).toEqual({
      x: 2,
      y: 1,
      width: 3, // from x=2 to x=4
      height: 2, // from y=1 to y=2
    });
  });

  test("should handle pixels at corners", () => {
    // 7x5 image with pixels only at corners
    const width = 7;
    const height = 5;
    const data = Buffer.alloc(width * height * 4, 0);

    // Set corner pixels
    const setPixel = (x: number, y: number) => {
      const idx = (y * width + x) * 4;
      data[idx + 3] = 255;
    };

    setPixel(0, 0); // top-left
    setPixel(6, 0); // top-right
    setPixel(0, 4); // bottom-left
    setPixel(6, 4); // bottom-right

    const bbox = findBoundingBox(data, width, height);

    expect(bbox).toEqual({
      x: 0,
      y: 0,
      width: 7,
      height: 5,
    });
  });

  test("should handle content at edge of wide image", () => {
    // 12x3 wide image with content on right edge
    const width = 12;
    const height = 3;
    const data = Buffer.alloc(width * height * 4, 0);

    // Set pixels at right edge
    const setPixel = (x: number, y: number) => {
      const idx = (y * width + x) * 4;
      data[idx + 3] = 255;
    };

    setPixel(10, 0);
    setPixel(11, 1);
    setPixel(10, 2);

    const bbox = findBoundingBox(data, width, height);

    expect(bbox).toEqual({
      x: 10,
      y: 0,
      width: 2,
      height: 3,
    });
  });
});
