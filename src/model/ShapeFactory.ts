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
  private readonly svgGeometry = new Map<string, readonly string[]>([
    ["g", []],
    ["rect", ["x", "y", "width", "height"]],
    ["circle", ["cx", "cy", "r"]],
    ["ellipse", ["cx", "cy", "rx", "ry"]],
    ["line", ["x1", "y1", "x2", "y2"]],
    ["text", ["x", "y"]]
  ]);

  /** The only shape-name mapping also owns the supported import schema. */
  createFromSvg(
    type: string,
    id: string,
    attributes: ReadonlyMap<string, string>,
    text: string | undefined
  ): Shape {
    const geometry = this.svgGeometry.get(type);
    if (geometry === undefined) {
      throw new EditorError(`unsupported SVG element: <${type}>`);
    }
    const styles = ["fill", "stroke", "stroke-width"] as const;
    const allowed = new Set(["id", ...geometry, ...styles]);
    for (const attribute of attributes.keys()) {
      if (!allowed.has(attribute)) {
        throw new EditorError(`unsupported SVG attribute: ${attribute} on <${type}>`);
      }
    }
    if (type !== "text" && text !== undefined) {
      throw new EditorError(`unsupported text content in <${type}>`);
    }
    const parameters = geometry.map((name) => {
      const value = attributes.get(name);
      if (value === undefined) {
        throw new EditorError(`missing SVG attribute: ${name} on <${type}>`);
      }
      return value;
    });
    if (type === "text") parameters.push(text ?? "");
    const shape = this.create(type, id, parameters);
    for (const style of styles) {
      const value = attributes.get(style);
      if (value !== undefined) shape.prepareSet(style, value).apply();
    }
    return shape;
  }

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
