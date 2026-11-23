import type { ShapeProvider } from "../../core/plugin-api";
import { EllipseShape } from "./EllipseShape";
import { parseShapeNumber, requireShapeArgumentCount } from "./ShapeArguments";

/** Owns the Phase 1 CLI argument rules for ellipses. */
export class EllipseShapeProvider implements ShapeProvider {
  readonly type = "ellipse";

  create(id: string, parameters: readonly string[]): EllipseShape {
    requireShapeArgumentCount(this.type, parameters, 4, 5);
    const shape = new EllipseShape(
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
