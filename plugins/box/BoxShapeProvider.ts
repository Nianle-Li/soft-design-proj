import { EditorError } from "../../src/core/plugin-api";
import type { ShapeCreationContext, ShapeProvider, SvgReadInput } from "../../src/core/plugin-api";
import { BoxShape } from "./BoxShape";

const DEFAULT_FILL = "#4a90d9";

/** Builds a detached box subtree exclusively through the public creation context. */
export class BoxShapeProvider implements ShapeProvider {
  readonly type = "box";

  create(id: string, parameters: readonly string[], context: ShapeCreationContext): BoxShape {
    if (parameters.length !== 5) throw new EditorError("invalid arguments for box");
    const x = this.number(parameters[0]);
    const y = this.number(parameters[1]);
    const width = this.number(parameters[2]);
    const height = this.number(parameters[3]);
    const title = parameters[4] ?? "";
    const frame = context.create("rect", `${id}-rect`, [
      String(x),
      String(y),
      String(width),
      String(height),
      DEFAULT_FILL
    ]);
    const label = context.create("text", `${id}-label`, [
      String(x + 20),
      String(y + height / 2 + 5),
      title
    ]);
    if (frame.kind !== "rect" || label.kind !== "text") {
      throw new EditorError("box requires rect and text providers");
    }
    return new BoxShape(id, frame, label);
  }

  readSvg(element: SvgReadInput): BoxShape {
    if (element.tag !== "g" || element.attributes.get("data-kind") !== "box") {
      throw new EditorError(`invalid box structure: ${element.id}`);
    }
    const allowed = new Set(["id", "data-kind", "fill", "stroke", "stroke-width"]);
    for (const attribute of element.attributes.keys()) {
      if (!allowed.has(attribute)) {
        throw new EditorError(`unsupported SVG attribute: ${attribute} on <g>`);
      }
    }
    if (element.text.trim() !== "") {
      throw new EditorError("unsupported text content in <g>");
    }
    const [frame, title, ...content] = element.children;
    if (
      frame?.kind !== "rect" ||
      frame.id !== `${element.id}-rect` ||
      title?.kind !== "text" ||
      title.id !== `${element.id}-label`
    ) {
      throw new EditorError(`invalid box structure: ${element.id}`);
    }
    const box = new BoxShape(element.id, frame, title);
    for (const child of content) box.insertChild(box.childCount, child);
    for (const attribute of ["fill", "stroke", "stroke-width"] as const) {
      const value = element.attributes.get(attribute);
      if (value !== undefined) box.prepareSet(attribute, value).apply();
    }
    return box;
  }

  private number(value: string | undefined): number {
    const parsed = Number(value);
    if (value === undefined || value.trim() === "" || !Number.isFinite(parsed)) {
      throw new EditorError(`invalid number: ${value ?? ""}`);
    }
    return parsed;
  }
}
