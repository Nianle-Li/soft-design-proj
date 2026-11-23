import type { ShapeProvider } from "../../core/plugin-api";
import { CircleShape } from "./CircleShape";
import { parseShapeNumber, requireShapeArgumentCount } from "./ShapeArguments";

/** Owns the Phase 1 CLI argument rules for circles. */
export class CircleShapeProvider implements ShapeProvider {
  readonly type = "circle";

  create(id: string, parameters: readonly string[]): CircleShape {
    requireShapeArgumentCount(this.type, parameters, 3, 4);
    const shape = new CircleShape(
      id,
      parseShapeNumber(parameters[0]),
      parseShapeNumber(parameters[1]),
      parseShapeNumber(parameters[2])
    );
    const fill = parameters[3];
    if (fill !== undefined) shape.prepareSet("fill", fill).apply();
    return shape;
  }
}
