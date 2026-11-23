import { EditorError } from "../../core/plugin-api";
import type { ShapeProvider } from "../../core/plugin-api";
import { GroupShape } from "./GroupShape";

/** Constructs an ordinary SVG group from the Phase 1 create syntax. */
export class GroupShapeProvider implements ShapeProvider {
  readonly type = "g";

  create(id: string, parameters: readonly string[]): GroupShape {
    if (parameters.length !== 0) {
      throw new EditorError("invalid arguments for g");
    }
    return new GroupShape(id);
  }
}
