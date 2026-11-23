import { EditorError } from "../../core/plugin-api";
import type { Shape, SvgReadInput } from "../../core/plugin-api";

/** Checks the Phase 1 SVG subset shared by the built-in shape readers. */
export function readBuiltinSvgParameters(
  element: SvgReadInput,
  geometry: readonly string[],
  allowText = false
): readonly string[] {
  const allowed = new Set(["id", ...geometry, "fill", "stroke", "stroke-width"]);
  for (const attribute of element.attributes.keys()) {
    if (!allowed.has(attribute)) {
      throw new EditorError(`unsupported SVG attribute: ${attribute} on <${element.tag}>`);
    }
  }
  if (!allowText && element.text.trim() !== "") {
    throw new EditorError(`unsupported text content in <${element.tag}>`);
  }
  return geometry.map((name) => {
    const value = element.attributes.get(name);
    if (value === undefined) {
      throw new EditorError(`missing SVG attribute: ${name} on <${element.tag}>`);
    }
    return value;
  });
}

/** Restores only the paint attributes that were explicitly present in the SVG. */
export function applyBuiltinSvgStyle(shape: Shape, attributes: ReadonlyMap<string, string>): void {
  for (const attribute of ["fill", "stroke", "stroke-width"] as const) {
    const value = attributes.get(attribute);
    if (value !== undefined) shape.prepareSet(attribute, value).apply();
  }
}
