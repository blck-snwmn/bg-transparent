import { parseCliArgs } from "./src/cli";
import { processImage } from "./src/image-processor";

async function main() {
  const options = parseCliArgs();

  if (!options) {
    process.exit(1);
  }

  try {
    await processImage(options);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
