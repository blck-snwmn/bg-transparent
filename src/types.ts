export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

export interface CliOptions {
  input: string;
  output: string;
  tolerance: number;
  color: RGB | null;
  reference: string;
  noResize: boolean;
}

export interface ImageInfo {
  width: number;
  height: number;
  channels: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReferenceInfo {
  width: number;
  height: number;
  contentBounds: BoundingBox;
}

export interface ProcessOptions {
  tolerance: number;
  color: RGB | null;
  refInfo: ReferenceInfo | null;
}

export interface ImageInput {
  data: Buffer;
  info: ImageInfo;
}

export interface ProcessResult {
  data: Buffer;
  width: number;
  height: number;
}
