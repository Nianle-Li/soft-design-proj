import { GroupShapeProvider } from "../../builtin/shapes/GroupShapeProvider";
import type { ShapeProvider } from "../../core/model/ShapeProvider";
import { ShapeProviderRegistry } from "../../core/model/ShapeProviderRegistry";

/** The host owns the concrete built-in selection and optional additions. */
export function createDefaultShapeProviders(
  optional: readonly ShapeProvider[] = []
): ShapeProviderRegistry {
  return new ShapeProviderRegistry([new GroupShapeProvider(), ...optional]);
}
