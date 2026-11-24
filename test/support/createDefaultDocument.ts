import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";
import { SvgDocument } from "../../src/core/model/SvgDocument";

/** Mirrors the host's explicit built-in provider assembly in document tests. */
export function createDefaultDocument(width: number, height: number): SvgDocument {
  return new SvgDocument(width, height, createDefaultShapeProviders());
}
