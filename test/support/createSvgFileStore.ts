import { SvgCodec } from "../../src/adapters/svg/SvgCodec";
import { SvgFileStore } from "../../src/adapters/svg/SvgFileStore";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";

/** Supplies the same built-in SVG readers as the process assembly for file tests. */
export function createSvgFileStore(): SvgFileStore {
  return new SvgFileStore(new SvgCodec(createDefaultShapeProviders()));
}
