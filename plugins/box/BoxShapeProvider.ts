import { EditorError } from "../../src/core/plugin-api";
import type { ShapeCreationContext, ShapeProvider } from "../../src/core/plugin-api";
import { BoxShape } from "./BoxShape";

const DEFAULT_FILL = "#4a90d9";

/** Builds a detached box subtree exclusively through the public creation context. */
export class BoxShapeProvider implements ShapeProvider {
  readonly type = "box";

  create(id: string, parameters: readonly string[], context: ShapeCreationContext): BoxShape {
    if (parameters.length !== 5) throw new EditorError("invalid arguments for box");
    const x = this.number(parameters[0]);
    const y = this.number(parameters[1]);
    const width = this.number(parameters[2]);
    const height = this.number(parameters[3]);
    const title = parameters[4] ?? "";
    const frame = context.create("rect", `${id}-rect`, [
      String(x),
      String(y),
      String(width),
      String(height),
      DEFAULT_FILL
    ]);
    const label = context.create("text", `${id}-label`, [
      String(x + 20),
      String(y + height / 2 + 5),
      title
    ]);
    if (frame.kind !== "rect" || label.kind !== "text") {
      throw new EditorError("box requires rect and text providers");
    }
    return new BoxShape(id, frame, label);
  }

  private number(value: string | undefined): number {
    const parsed = Number(value);
    if (value === undefined || value.trim() === "" || !Number.isFinite(parsed)) {
      throw new EditorError(`invalid number: ${value ?? ""}`);
    }
    return parsed;
  }
}
