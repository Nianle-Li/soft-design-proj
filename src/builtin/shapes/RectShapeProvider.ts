import type { ShapeProvider } from "../../core/plugin-api";
import { RectShape } from "./RectShape";
import { parseShapeNumber, requireShapeArgumentCount } from "./ShapeArguments";

/** Owns the Phase 1 CLI argument rules for rectangles. */
export class RectShapeProvider implements ShapeProvider {
  readonly type = "rect";

  create(id: string, parameters: readonly string[]): RectShape {
    requireShapeArgumentCount(this.type, parameters, 4, 5);
    const shape = new RectShape(
      id,
      parseShapeNumber(parameters[0]),
      parseShapeNumber(parameters[1]),
      parseShapeNumber(parameters[2]),
      parseShapeNumber(parameters[3])
    );
    const fill = parameters[4];
    if (fill !== undefined) shape.prepareSet("fill", fill).apply();
    return shape;
  }
}
