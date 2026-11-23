import { EditorError } from "../../core/plugin-api";
import type { ShapeProvider } from "../../core/plugin-api";
import { CircleShape } from "./CircleShape";

/** Owns the Phase 1 CLI argument rules for circles. */
export class CircleShapeProvider implements ShapeProvider {
  readonly type = "circle";

  create(id: string, parameters: readonly string[]): CircleShape {
    if (parameters.length < 3 || parameters.length > 4) {
      throw new EditorError("invalid arguments for circle");
    }
    const number = (value: string | undefined): number => {
      const parsed = Number(value);
      if (value === undefined || value.trim() === "" || !Number.isFinite(parsed)) {
        throw new EditorError(`invalid number: ${value ?? ""}`);
      }
      return parsed;
    };
    const shape = new CircleShape(
      id,
      number(parameters[0]),
      number(parameters[1]),
      number(parameters[2])
    );
    const fill = parameters[3];
    if (fill !== undefined) shape.prepareSet("fill", fill).apply();
    return shape;
  }
}
