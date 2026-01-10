import sharp from "sharp";
import type {
  CliOptions,
  RGB,
  ImageInfo,
  ReferenceInfo,
  ProcessOptions,
  ImageInput,
  ProcessResult,
} from "./types";
import { detectBackgroundColor } from "./background-detector";
import { makeTransparent } from "./transparent";
import { findBoundingBox } from "./bounding-box";

/**
 * Process image data: make background transparent and optionally align to reference
 *
 * Pure data processing function without file I/O.
 *
 * @param input - Input image data and metadata
 * @param options - Processing options (tolerance, color, refInfo)
 * @returns Processed image as PNG buffer with dimensions
 */
export async function processImageData(
  input: ImageInput,
  options: ProcessOptions
): Promise<ProcessResult> {
  const { data, info } = input;
  const { tolerance, color, refInfo } = options;

  const imageInfo: ImageInfo = {
    width: info.width,
    height: info.height,
    channels: info.channels,
  };

  // Detect or use provided background color
  const bgColor: RGB = color ?? detectBackgroundColor(data, imageInfo);

  // Make background transparent
  const transparentData = makeTransparent(data, imageInfo, bgColor, tolerance);

  // Find bounding box of the content in input image
  const inputBounds = findBoundingBox(transparentData, info.width, info.height);

  // Create transparent image
  let outputImage = sharp(transparentData, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  });

  if (refInfo) {
    // Calculate scale to match content sizes
    const scaleX = refInfo.contentBounds.width / inputBounds.width;
    const scaleY = refInfo.contentBounds.height / inputBounds.height;
    // Use the smaller scale to ensure content fits
    const scale = Math.min(scaleX, scaleY);

    // Calculate new dimensions after scaling
    const scaledWidth = Math.round(info.width * scale);
    const scaledHeight = Math.round(info.height * scale);

    // Scale the input image
    const scaledImage = await outputImage
      .resize(scaledWidth, scaledHeight, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Calculate where the content would be after scaling
    const scaledBoundsX = Math.round(inputBounds.x * scale);
    const scaledBoundsY = Math.round(inputBounds.y * scale);

    // Calculate offset to align content positions
    const offsetX = refInfo.contentBounds.x - scaledBoundsX;
    const offsetY = refInfo.contentBounds.y - scaledBoundsY;

    // Calculate the region of scaled image that fits in the reference canvas
    const clipLeft = Math.max(0, -offsetX);
    const clipTop = Math.max(0, -offsetY);
    const clipRight = Math.min(scaledImage.info.width, refInfo.width - offsetX);
    const clipBottom = Math.min(
      scaledImage.info.height,
      refInfo.height - offsetY
    );

    const clipWidth = clipRight - clipLeft;
    const clipHeight = clipBottom - clipTop;

    // Extract the visible portion of the scaled image
    const clippedImage = await sharp(scaledImage.data, {
      raw: {
        width: scaledImage.info.width,
        height: scaledImage.info.height,
        channels: 4,
      },
    })
      .extract({
        left: clipLeft,
        top: clipTop,
        width: Math.max(1, clipWidth),
        height: Math.max(1, clipHeight),
      })
      .png()
      .toBuffer();

    // Calculate position on final canvas
    const finalLeft = Math.max(0, offsetX);
    const finalTop = Math.max(0, offsetY);

    // Create final canvas with reference dimensions
    const resultBuffer = await sharp({
      create: {
        width: refInfo.width,
        height: refInfo.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: clippedImage,
          left: finalLeft,
          top: finalTop,
        },
      ])
      .png()
      .toBuffer();

    return {
      data: resultBuffer,
      width: refInfo.width,
      height: refInfo.height,
    };
  } else {
    // No resize, just return transparent image as PNG
    const resultBuffer = await outputImage.png().toBuffer();
    return {
      data: resultBuffer,
      width: info.width,
      height: info.height,
    };
  }
}

/**
 * Process an image file: make background transparent and align to reference image
 *
 * File I/O wrapper around processImageData.
 *
 * @param options - CLI options including input/output paths and processing settings
 */
export async function processImage(options: CliOptions): Promise<void> {
  const { input, output, tolerance, color, reference, noResize } = options;

  // Check if input exists
  const inputFile = Bun.file(input);
  if (!(await inputFile.exists())) {
    throw new Error(`Input file not found: ${input}`);
  }

  // Get reference info if needed
  let refInfo: ReferenceInfo | null = null;
  if (!noResize) {
    const refFile = Bun.file(reference);
    if (!(await refFile.exists())) {
      throw new Error(`Reference file not found: ${reference}`);
    }

    const { data: refData, info: refSharpInfo } = await sharp(reference)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (!refSharpInfo.width || !refSharpInfo.height) {
      throw new Error(`Could not read reference image dimensions: ${reference}`);
    }

    refInfo = {
      width: refSharpInfo.width,
      height: refSharpInfo.height,
      contentBounds: findBoundingBox(refData, refSharpInfo.width, refSharpInfo.height),
    };
  }

  // Load image and get raw data
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const imageInput: ImageInput = {
    data,
    info: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  };

  // Process image data
  const result = await processImageData(imageInput, {
    tolerance,
    color,
    refInfo,
  });

  // Save result to file
  await sharp(result.data, {
    raw: {
      width: result.width,
      height: result.height,
      channels: 4,
    },
  })
    .png()
    .toFile(output);

  console.log(`Output saved: ${output}`);
}
