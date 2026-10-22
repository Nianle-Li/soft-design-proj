import { EditorError } from "./EditorError";
import { GroupShape } from "./GroupShape";
import { RectShape } from "./RectShape";
import { Shape } from "./Shape";

/** The sole shape-name dispatch point; future plugin work may replace it with registration. */
export class ShapeFactory {
  create(type: string, id: string, parameters: readonly string[]): Shape {
    switch (type) {
      case "g":
        if (parameters.length !== 0) {
          throw new EditorError("invalid arguments for g");
        }
        return new GroupShape(id);
      case "rect":
        if (parameters.length < 4 || parameters.length > 5) {
          throw new EditorError("invalid arguments for rect");
        }
        return new RectShape(
          id,
          this.number(parameters[0]),
          this.number(parameters[1]),
          this.number(parameters[2]),
          this.number(parameters[3]),
          parameters[4]
        );
      default:
        throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }

  private number(value: string | undefined): number {
    const number = Number(value);
    if (value === undefined || value.trim() === "" || !Number.isFinite(number)) {
      throw new EditorError(`invalid number: ${value ?? ""}`);
    }
    return number;
  }
}
