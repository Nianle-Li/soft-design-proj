import type { ShapeProvider } from "../../core/plugin-api";
import { parseShapeNumber, requireShapeArgumentCount } from "./ShapeArguments";
import { TextShape } from "./TextShape";

/** Owns the Phase 1 CLI argument rules for text. */
export class TextShapeProvider implements ShapeProvider {
  readonly type = "text";

  create(id: string, parameters: readonly string[]): TextShape {
    requireShapeArgumentCount(this.type, parameters, 3, 3);
    return new TextShape(
      id,
      parseShapeNumber(parameters[0]),
      parseShapeNumber(parameters[1]),
      parameters[2] ?? ""
    );
  }
}
