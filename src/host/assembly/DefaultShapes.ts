import { CircleShapeProvider } from "../../builtin/shapes/CircleShapeProvider";
import { EllipseShapeProvider } from "../../builtin/shapes/EllipseShapeProvider";
import { GroupShapeProvider } from "../../builtin/shapes/GroupShapeProvider";
import { RectShapeProvider } from "../../builtin/shapes/RectShapeProvider";
import type { ShapeProvider } from "../../core/model/ShapeProvider";
import { ShapeProviderRegistry } from "../../core/model/ShapeProviderRegistry";

/** The host owns the concrete built-in selection and optional additions. */
export function createDefaultShapeProviders(
  optional: readonly ShapeProvider[] = []
): ShapeProviderRegistry {
  return new ShapeProviderRegistry([
    new GroupShapeProvider(),
    new RectShapeProvider(),
    new CircleShapeProvider(),
    new EllipseShapeProvider(),
    ...optional
  ]);
}
