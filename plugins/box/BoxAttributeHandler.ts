import { EditorError } from "../../src/core/plugin-api";
import type { AttributeHandler, PreparedSet, Shape } from "../../src/core/plugin-api";
import { BoxShape } from "./BoxShape";

/** Maps box-level domain attributes to reversible changes owned by BoxShape. */
export class BoxAttributeHandler implements AttributeHandler {
  readonly name = "box-attributes";

  handles(shape: Shape, attribute: string): boolean {
    return shape instanceof BoxShape && (attribute === "fill" || attribute === "label");
  }

  prepare(shape: Shape, attribute: string, value: string): PreparedSet {
    if (!(shape instanceof BoxShape)) {
      throw new EditorError("box attribute handler requires a box target");
    }
    switch (attribute) {
      case "fill":
        return shape.prepareFill(value);
      case "label":
        return shape.prepareLabel(value);
      default:
        throw new EditorError(`unknown box attribute: ${attribute}`);
    }
  }
}
