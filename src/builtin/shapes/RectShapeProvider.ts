import { EditorError } from "../../core/plugin-api";
import type { ShapeProvider } from "../../core/plugin-api";
import { RectShape } from "./RectShape";

/** Owns the Phase 1 CLI argument rules for rectangles. */
export class RectShapeProvider implements ShapeProvider {
  readonly type = "rect";

  create(id: string, parameters: readonly string[]): RectShape {
    if (parameters.length < 4 || parameters.length > 5) {
      throw new EditorError("invalid arguments for rect");
    }
    const number = (value: string | undefined): number => {
      const parsed = Number(value);
      if (value === undefined || value.trim() === "" || !Number.isFinite(parsed)) {
        throw new EditorError(`invalid number: ${value ?? ""}`);
      }
      return parsed;
    };
    const shape = new RectShape(
      id,
      number(parameters[0]),
      number(parameters[1]),
      number(parameters[2]),
      number(parameters[3])
    );
    const fill = parameters[4];
    if (fill !== undefined) shape.prepareSet("fill", fill).apply();
    return shape;
  }
}
