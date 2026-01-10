import { parseArgs } from "util";
import { resolve, basename, dirname, extname } from "path";
import type { CliOptions, RGB } from "./types";

/**
 * Parse a hex color string to RGB object
 * @param hex - Hex color string (e.g., "#FFFFFF" or "FFFFFF")
 * @returns RGB color object
 * @throws Error if hex string is invalid
 */
function parseHexColor(hex: string): RGB {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

/**
 * Generate output file path from input path
 * @param inputPath - Input image file path
 * @returns Output path in output directory with .png extension
 */
function generateOutputPath(inputPath: string): string {
  const ext = extname(inputPath);
  const name = basename(inputPath, ext);
  return resolve("output", `${name}.png`);
}

function showHelp(): void {
  console.log(`
Usage: bun run index.ts <input> [options]

Arguments:
  <input>              Input image path (required)

Options:
  -o, --output         Output image path (default: output/<input>.png)
  -t, --tolerance      Background color tolerance 0-255 (default: 30)
  -c, --color          Background color in hex format (default: auto-detect)
  -r, --reference      Reference image for size (default: ref.png)
  --no-resize          Skip resizing to reference size
  -h, --help           Show this help message

Examples:
  bun run index.ts ./input.png
  bun run index.ts ./input.png -o ./output.png -t 50
  bun run index.ts ./input.png -c "#FFFFFF"
`);
}

/**
 * Parse command line arguments and return CLI options
 * @returns Parsed CLI options, or null if help was shown or validation failed
 */
export function parseCliArgs(): CliOptions | null {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      output: { type: "string", short: "o" },
      tolerance: { type: "string", short: "t", default: "30" },
      color: { type: "string", short: "c" },
      reference: { type: "string", short: "r", default: "ref.png" },
      "no-resize": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    showHelp();
    process.exit(0);
  }

  if (positionals.length === 0) {
    console.error("Error: Input image path is required");
    showHelp();
    return null;
  }

  const input = resolve(positionals[0]!);
  const tolerance = parseInt(values.tolerance as string, 10);

  if (isNaN(tolerance) || tolerance < 0 || tolerance > 255) {
    console.error("Error: Tolerance must be a number between 0 and 255");
    return null;
  }

  let color: RGB | null = null;
  if (values.color) {
    try {
      color = parseHexColor(values.color as string);
    } catch (e) {
      console.error(`Error: ${(e as Error).message}`);
      return null;
    }
  }

  return {
    input,
    output: values.output ? resolve(values.output) : generateOutputPath(input),
    tolerance,
    color,
    reference: resolve(values.reference as string),
    noResize: values["no-resize"] as boolean,
  };
}
