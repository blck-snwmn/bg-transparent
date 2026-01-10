import sharp from "sharp";
import type { CliOptions, RGB, ImageInfo, BoundingBox } from "./types";
import { detectBackgroundColor, rgbToHex } from "./background-detector";
import { makeTransparent } from "./transparent";
import { findBoundingBox } from "./bounding-box";

/** Reference image metadata including content bounding box */
interface ReferenceInfo {
  width: number;
  height: number;
  emaBounds: BoundingBox;
}

/**
 * Get reference image info including dimensions and content bounding box
 * @param referencePath - Path to reference image
 * @returns Reference image metadata
 */
async function getReferenceInfo(referencePath: string): Promise<ReferenceInfo> {
  const { data, info } = await sharp(referencePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (!info.width || !info.height) {
    throw new Error(`Could not read reference image dimensions: ${referencePath}`);
  }

  const emaBounds = findBoundingBox(data, info.width, info.height);

  return {
    width: info.width,
    height: info.height,
    emaBounds,
  };
}

/**
 * Process an image: make background transparent and align to reference image
 *
 * 1. Load input image and detect/use background color
 * 2. Make background transparent
 * 3. If resize enabled: scale and position to match reference image's content
 * 4. Save as PNG with transparency
 *
 * @param options - CLI options including input/output paths and processing settings
 */
export async function processImage(options: CliOptions): Promise<void> {
  const { input, output, tolerance, color, reference, noResize, verbose } = options;

  const log = (msg: string) => {
    if (verbose) console.log(msg);
  };

  log(`Processing: ${input}`);

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
    refInfo = await getReferenceInfo(reference);
    log(`Reference image: ${refInfo.width}x${refInfo.height}`);
    log(`Reference ema bounds: x=${refInfo.emaBounds.x}, y=${refInfo.emaBounds.y}, w=${refInfo.emaBounds.width}, h=${refInfo.emaBounds.height}`);
  }

  // Load image and get raw data
  const image = sharp(input);
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const imageInfo: ImageInfo = {
    width: info.width,
    height: info.height,
    channels: info.channels,
  };

  log(`Input size: ${info.width}x${info.height}`);

  // Detect or use provided background color
  const bgColor: RGB = color ?? detectBackgroundColor(data, imageInfo);
  log(`Background color: ${rgbToHex(bgColor)}`);

  // Make background transparent
  const transparentData = makeTransparent(data, imageInfo, bgColor, tolerance);

  // Find bounding box of the ema in input image
  const inputEmaBounds = findBoundingBox(transparentData, info.width, info.height);
  log(`Input ema bounds: x=${inputEmaBounds.x}, y=${inputEmaBounds.y}, w=${inputEmaBounds.width}, h=${inputEmaBounds.height}`);

  // Create transparent image
  let outputImage = sharp(transparentData, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  });

  if (refInfo) {
    // Calculate scale to match ema sizes
    const scaleX = refInfo.emaBounds.width / inputEmaBounds.width;
    const scaleY = refInfo.emaBounds.height / inputEmaBounds.height;
    // Use the smaller scale to ensure ema fits
    const scale = Math.min(scaleX, scaleY);
    log(`Scale factor: ${scale.toFixed(3)}`);

    // Calculate new dimensions after scaling
    const scaledWidth = Math.round(info.width * scale);
    const scaledHeight = Math.round(info.height * scale);

    // Scale the input image
    const scaledImage = await outputImage
      .resize(scaledWidth, scaledHeight, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Calculate where the ema would be after scaling
    const scaledEmaX = Math.round(inputEmaBounds.x * scale);
    const scaledEmaY = Math.round(inputEmaBounds.y * scale);

    // Calculate offset to align ema positions
    const offsetX = refInfo.emaBounds.x - scaledEmaX;
    const offsetY = refInfo.emaBounds.y - scaledEmaY;
    log(`Offset: x=${offsetX}, y=${offsetY}`);

    // Calculate the region of scaled image that fits in the reference canvas
    const clipLeft = Math.max(0, -offsetX);
    const clipTop = Math.max(0, -offsetY);
    const clipRight = Math.min(scaledImage.info.width, refInfo.width - offsetX);
    const clipBottom = Math.min(scaledImage.info.height, refInfo.height - offsetY);

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
    log(`Final position: left=${finalLeft}, top=${finalTop}`);

    // Create final canvas with reference dimensions
    const finalImage = sharp({
      create: {
        width: refInfo.width,
        height: refInfo.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite([
      {
        input: clippedImage,
        left: finalLeft,
        top: finalTop,
      },
    ]);

    await finalImage.png().toFile(output);
    log(`Output size: ${refInfo.width}x${refInfo.height}`);
  } else {
    // No resize, just save transparent image
    await outputImage.png().toFile(output);
  }

  console.log(`Output saved: ${output}`);
}
