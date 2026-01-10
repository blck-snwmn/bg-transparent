import { describe, test, expect } from "vitest";
import sharp from "sharp";
import { processImageData } from "./image-processor";
import type { ImageInput, ProcessOptions, ReferenceInfo } from "./types";

describe("processImageData", () => {
  test("should make white background transparent (150x80 image)", async () => {
    const width = 150;
    const height = 80;

    // Create image with white background and colored rectangle
    const { data, info } = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 50,
              height: 30,
              channels: 4,
              background: { r: 128, g: 64, b: 192, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
          left: 50,
          top: 25,
        },
      ])
      .raw()
      .toBuffer({ resolveWithObject: true });

    const input: ImageInput = {
      data,
      info: { width: info.width, height: info.height, channels: info.channels },
    };

    const options: ProcessOptions = {
      tolerance: 10,
      color: { r: 255, g: 255, b: 255 },
      refInfo: null,
    };

    const result = await processImageData(input, options);

    // Verify output dimensions
    expect(result.width).toBe(width);
    expect(result.height).toBe(height);

    // Decode PNG to raw data to check transparency
    const outputRaw = await sharp(result.data).raw().toBuffer();

    // Corner should be transparent (alpha = 0)
    expect(outputRaw[3]).toBe(0);

    // Center of colored area should be opaque
    const centerIdx = (40 * width + 75) * 4;
    expect(outputRaw[centerIdx + 3]).toBe(255);
  });

  test("should auto-detect background color (100x60 image)", async () => {
    const width = 100;
    const height = 60;

    // Create image with blue background
    const { data, info } = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 100, b: 200, alpha: 1 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 30,
              height: 20,
              channels: 4,
              background: { r: 255, g: 255, b: 0, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
          left: 35,
          top: 20,
        },
      ])
      .raw()
      .toBuffer({ resolveWithObject: true });

    const input: ImageInput = {
      data,
      info: { width: info.width, height: info.height, channels: info.channels },
    };

    const options: ProcessOptions = {
      tolerance: 10,
      color: null, // Auto-detect
      refInfo: null,
    };

    const result = await processImageData(input, options);

    // Decode and check
    const outputRaw = await sharp(result.data).raw().toBuffer();

    // Blue background should be transparent
    expect(outputRaw[3]).toBe(0);

    // Yellow content should be opaque
    const yellowIdx = (30 * width + 50) * 4;
    expect(outputRaw[yellowIdx + 3]).toBe(255);
  });

  test("should resize and align to reference (180x60 → 240x80)", async () => {
    const inputWidth = 180;
    const inputHeight = 60;

    // Create input image with gray background and red content
    const { data: inputData, info: inputInfo } = await sharp({
      create: {
        width: inputWidth,
        height: inputHeight,
        channels: 4,
        background: { r: 200, g: 200, b: 200, alpha: 1 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 60,
              height: 30,
              channels: 4,
              background: { r: 255, g: 0, b: 0, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
          left: 60,
          top: 15,
        },
      ])
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Create reference info (240x80 with content at specific position)
    const refInfo: ReferenceInfo = {
      width: 240,
      height: 80,
      contentBounds: {
        x: 80,
        y: 20,
        width: 80,
        height: 40,
      },
    };

    const input: ImageInput = {
      data: inputData,
      info: {
        width: inputInfo.width,
        height: inputInfo.height,
        channels: inputInfo.channels,
      },
    };

    const options: ProcessOptions = {
      tolerance: 10,
      color: { r: 200, g: 200, b: 200 },
      refInfo,
    };

    const result = await processImageData(input, options);

    // Output should match reference dimensions
    expect(result.width).toBe(240);
    expect(result.height).toBe(80);
  });

  test("should handle very wide image (300x50)", async () => {
    const width = 300;
    const height = 50;

    const { data, info } = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 128, g: 128, b: 128, alpha: 1 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 100,
              height: 20,
              channels: 4,
              background: { r: 255, g: 100, b: 50, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
          left: 100,
          top: 15,
        },
      ])
      .raw()
      .toBuffer({ resolveWithObject: true });

    const input: ImageInput = {
      data,
      info: { width: info.width, height: info.height, channels: info.channels },
    };

    const options: ProcessOptions = {
      tolerance: 10,
      color: null,
      refInfo: null,
    };

    const result = await processImageData(input, options);

    expect(result.width).toBe(width);
    expect(result.height).toBe(height);

    // Verify corners are transparent
    const outputRaw = await sharp(result.data).raw().toBuffer();
    expect(outputRaw[3]).toBe(0); // Top-left
  });

  test("should handle very tall image (40x250)", async () => {
    const width = 40;
    const height = 250;

    const { data, info } = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 50, g: 100, b: 150, alpha: 1 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 20,
              height: 100,
              channels: 4,
              background: { r: 255, g: 200, b: 100, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
          left: 10,
          top: 75,
        },
      ])
      .raw()
      .toBuffer({ resolveWithObject: true });

    const input: ImageInput = {
      data,
      info: { width: info.width, height: info.height, channels: info.channels },
    };

    const options: ProcessOptions = {
      tolerance: 10,
      color: null,
      refInfo: null,
    };

    const result = await processImageData(input, options);

    expect(result.width).toBe(width);
    expect(result.height).toBe(height);

    // Verify background is transparent
    const outputRaw = await sharp(result.data).raw().toBuffer();
    expect(outputRaw[3]).toBe(0);
  });

  test("should preserve content when no resize (120x90)", async () => {
    const width = 120;
    const height = 90;
    const contentLeft = 20;
    const contentTop = 15;
    const contentWidth = 60;
    const contentHeight = 45;

    const { data, info } = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: contentWidth,
              height: contentHeight,
              channels: 4,
              background: { r: 0, g: 0, b: 255, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
          left: contentLeft,
          top: contentTop,
        },
      ])
      .raw()
      .toBuffer({ resolveWithObject: true });

    const input: ImageInput = {
      data,
      info: { width: info.width, height: info.height, channels: info.channels },
    };

    const options: ProcessOptions = {
      tolerance: 10,
      color: null,
      refInfo: null,
    };

    const result = await processImageData(input, options);

    expect(result.width).toBe(width);
    expect(result.height).toBe(height);

    // Check that blue content is preserved
    const outputRaw = await sharp(result.data).raw().toBuffer();

    // Center of blue content should be opaque and blue
    const blueIdx = ((contentTop + 20) * width + (contentLeft + 30)) * 4;
    expect(outputRaw[blueIdx]).toBe(0); // R
    expect(outputRaw[blueIdx + 1]).toBe(0); // G
    expect(outputRaw[blueIdx + 2]).toBe(255); // B
    expect(outputRaw[blueIdx + 3]).toBe(255); // A (opaque)
  });
});
