import { CircleShape } from "./CircleShape";
import { EditorError } from "./EditorError";
import { EllipseShape } from "./EllipseShape";
import { GroupShape } from "./GroupShape";
import { LineShape } from "./LineShape";
import { RectShape } from "./RectShape";
import { Shape } from "./Shape";
import { TextShape } from "./TextShape";

/** The sole shape-name dispatch point; future plugin work may replace it with registration. */
export class ShapeFactory {
  create(type: string, id: string, parameters: readonly string[]): Shape {
    switch (type) {
      case "g":
        this.requireCount(type, parameters, 0, 0);
        return new GroupShape(id);
      case "rect":
        this.requireCount(type, parameters, 4, 5);
        return new RectShape(
          id,
          this.number(parameters[0]),
          this.number(parameters[1]),
          this.number(parameters[2]),
          this.number(parameters[3]),
          parameters[4]
        );
      case "circle":
        this.requireCount(type, parameters, 3, 4);
        return new CircleShape(
          id,
          this.number(parameters[0]),
          this.number(parameters[1]),
          this.number(parameters[2]),
          parameters[3]
        );
      case "ellipse":
        this.requireCount(type, parameters, 4, 5);
        return new EllipseShape(
          id,
          this.number(parameters[0]),
          this.number(parameters[1]),
          this.number(parameters[2]),
          this.number(parameters[3]),
          parameters[4]
        );
      case "line":
        this.requireCount(type, parameters, 4, 5);
        return new LineShape(
          id,
          this.number(parameters[0]),
          this.number(parameters[1]),
          this.number(parameters[2]),
          this.number(parameters[3]),
          parameters[4]
        );
      case "text":
        this.requireCount(type, parameters, 3, 3);
        return new TextShape(
          id,
          this.number(parameters[0]),
          this.number(parameters[1]),
          parameters[2] ?? ""
        );
      default:
        throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }

  private requireCount(
    type: string,
    parameters: readonly string[],
    minimum: number,
    maximum: number
  ): void {
    if (parameters.length < minimum || parameters.length > maximum) {
      throw new EditorError(`invalid arguments for ${type}`);
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
