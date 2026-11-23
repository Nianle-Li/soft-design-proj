import type { ShapeProvider } from "../../core/plugin-api";
import { LineShape } from "./LineShape";
import { parseShapeNumber, requireShapeArgumentCount } from "./ShapeArguments";

/** Owns the Phase 1 CLI argument rules for lines. */
export class LineShapeProvider implements ShapeProvider {
  readonly type = "line";

  create(id: string, parameters: readonly string[]): LineShape {
    requireShapeArgumentCount(this.type, parameters, 4, 5);
    const shape = new LineShape(
      id,
      parseShapeNumber(parameters[0]),
      parseShapeNumber(parameters[1]),
      parseShapeNumber(parameters[2]),
      parseShapeNumber(parameters[3])
    );
    const stroke = parameters[4];
    if (stroke !== undefined) shape.prepareSet("stroke", stroke).apply();
    return shape;
  }
}
