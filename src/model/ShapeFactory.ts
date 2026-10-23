import { CircleShape } from "./CircleShape";
import { EditorError } from "./EditorError";
import { EllipseShape } from "./EllipseShape";
import { GroupShape } from "./GroupShape";
import { LineShape } from "./LineShape";
import { RectShape } from "./RectShape";
import { Shape } from "./Shape";
import type { ShapeSpec } from "./ShapeSpec";
import { TextShape } from "./TextShape";

/** The sole shape-name boundary; both CLI arguments and SVG attributes become typed specs here. */
export class ShapeFactory {
  private readonly svgGeometry = new Map<string, readonly string[]>([
    ["g", []],
    ["rect", ["x", "y", "width", "height"]],
    ["circle", ["cx", "cy", "r"]],
    ["ellipse", ["cx", "cy", "rx", "ry"]],
    ["line", ["x1", "y1", "x2", "y2"]],
    ["text", ["x", "y"]]
  ]);

  parseCommand(type: string, id: string, parameters: readonly string[]): ShapeSpec {
    switch (type) {
      case "g":
        this.requireCount(type, parameters, 0, 0);
        return { kind: "g", id };
      case "rect":
        this.requireCount(type, parameters, 4, 5);
        return {
          kind: "rect",
          id,
          x: this.number(parameters[0]),
          y: this.number(parameters[1]),
          width: this.number(parameters[2]),
          height: this.number(parameters[3]),
          ...(parameters[4] === undefined ? {} : { fill: parameters[4] })
        };
      case "circle":
        this.requireCount(type, parameters, 3, 4);
        return {
          kind: "circle",
          id,
          cx: this.number(parameters[0]),
          cy: this.number(parameters[1]),
          r: this.number(parameters[2]),
          ...(parameters[3] === undefined ? {} : { fill: parameters[3] })
        };
      case "ellipse":
        this.requireCount(type, parameters, 4, 5);
        return {
          kind: "ellipse",
          id,
          cx: this.number(parameters[0]),
          cy: this.number(parameters[1]),
          rx: this.number(parameters[2]),
          ry: this.number(parameters[3]),
          ...(parameters[4] === undefined ? {} : { fill: parameters[4] })
        };
      case "line":
        this.requireCount(type, parameters, 4, 5);
        return {
          kind: "line",
          id,
          x1: this.number(parameters[0]),
          y1: this.number(parameters[1]),
          x2: this.number(parameters[2]),
          y2: this.number(parameters[3]),
          ...(parameters[4] === undefined ? {} : { stroke: parameters[4] })
        };
      case "text":
        this.requireCount(type, parameters, 3, 3);
        return {
          kind: "text",
          id,
          x: this.number(parameters[0]),
          y: this.number(parameters[1]),
          text: parameters[2] ?? ""
        };
      default:
        throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }

  parseSvg(
    type: string,
    id: string,
    attributes: ReadonlyMap<string, string>,
    text: string | undefined
  ): ShapeSpec {
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
    const spec = this.parseCommand(type, id, parameters);
    return {
      ...spec,
      ...(attributes.has("fill") ? { fill: attributes.get("fill") } : {}),
      ...(attributes.has("stroke") ? { stroke: attributes.get("stroke") } : {}),
      ...(attributes.has("stroke-width") ? { strokeWidth: attributes.get("stroke-width") } : {})
    } as ShapeSpec;
  }

  create(spec: ShapeSpec): Shape {
    for (const value of Object.values(spec)) {
      if (typeof value === "number" && !Number.isFinite(value)) {
        throw new EditorError(`invalid number: ${String(value)}`);
      }
    }
    let shape: Shape;
    switch (spec.kind) {
      case "g":
        shape = new GroupShape(spec.id);
        break;
      case "rect":
        shape = new RectShape(spec.id, spec.x, spec.y, spec.width, spec.height);
        break;
      case "circle":
        shape = new CircleShape(spec.id, spec.cx, spec.cy, spec.r);
        break;
      case "ellipse":
        shape = new EllipseShape(spec.id, spec.cx, spec.cy, spec.rx, spec.ry);
        break;
      case "line":
        shape = new LineShape(spec.id, spec.x1, spec.y1, spec.x2, spec.y2);
        break;
      case "text":
        shape = new TextShape(spec.id, spec.x, spec.y, spec.text);
        break;
    }
    if (spec.fill !== undefined) shape.prepareSet("fill", spec.fill).apply();
    if (spec.stroke !== undefined) shape.prepareSet("stroke", spec.stroke).apply();
    if (spec.strokeWidth !== undefined) shape.prepareSet("stroke-width", spec.strokeWidth).apply();
    return shape;
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
