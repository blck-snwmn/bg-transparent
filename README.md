# bg-transparent

A CLI tool that makes image backgrounds transparent and aligns them to match a reference image's size and position.

## Overview

- Automatically detects and removes solid color backgrounds
- Scales and positions content to match the reference image's non-transparent area
- Outputs PNG format with transparency

## Requirements

- **Background must be a single solid color** (white, blue, green, etc.)
- Gradient backgrounds or multi-color backgrounds are not supported

## Installation

```bash
bun install
```

## Usage

```bash
bun run index.ts <input> [options]
```

### Basic Examples

```bash
# Convert input image (output: input_transparent.png)
bun run index.ts ./input.png

# Specify output path
bun run index.ts ./input.png -o ./output.png

# Show verbose logs
bun run index.ts ./input.png -v
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output` | Output image path | `<input>_transparent.png` |
| `-t, --tolerance` | Background color tolerance (0-255) | `30` |
| `-c, --color` | Manually specify background color (hex format) | Auto-detect |
| `-r, --reference` | Reference image for size/position | `ema.png` |
| `--no-resize` | Skip resizing to reference | `false` |
| `-v, --verbose` | Enable verbose logging | `false` |
| `-h, --help` | Show help | - |

### Manual Background Color Examples

```bash
# For blue background
bun run index.ts ./input.png -c "#0000FF"

# Increase tolerance (when background color varies slightly)
bun run index.ts ./input.png -t 50
```

## How It Works

1. Load input image
2. Detect background color (or use manually specified color)
3. Make background transparent
4. Scale and position to match reference image's non-transparent area
5. Save as PNG
