import { EditorError } from "../../src/core/plugin-api";
import type {
  Shape,
  ShapeCreationContext,
  ShapeProvider,
  SvgReadInput
} from "../../src/core/plugin-api";
import { DiamondShape } from "./DiamondShape";

type Point = readonly [number, number];

/** Builds a diamond exclusively from the registered line contract. */
export class DiamondShapeProvider implements ShapeProvider {
  readonly type = "diamond";

  create(id: string, parameters: readonly string[], context: ShapeCreationContext): DiamondShape {
    if (parameters.length < 4 || parameters.length > 5) {
      throw new EditorError("invalid arguments for diamond");
    }
    const x = this.number(parameters[0]);
    const y = this.number(parameters[1]);
    const width = this.nonNegative(parameters[2], "width");
    const height = this.nonNegative(parameters[3], "height");
    const points: readonly Point[] = [
      [x + width / 2, y],
      [x + width, y + height / 2],
      [x + width / 2, y + height],
      [x, y + height / 2]
    ];
    const edges = points.map((start, index) => {
      const end = points[(index + 1) % points.length] as Point;
      const lineParameters = [...start, ...end].map(String);
      const stroke = parameters[4];
      if (stroke !== undefined) lineParameters.push(stroke);
      return context.create("line", `${id}-edge-${index + 1}`, lineParameters);
    });
    this.requireEdges(edges);
    return new DiamondShape(id, edges);
  }

  readSvg(element: SvgReadInput): DiamondShape {
    if (element.tag !== "g" || element.attributes.get("data-kind") !== "diamond") {
      throw new EditorError(`invalid diamond structure: ${element.id}`);
    }
    const allowed = new Set(["id", "data-kind", "fill", "stroke", "stroke-width"]);
    for (const attribute of element.attributes.keys()) {
      if (!allowed.has(attribute)) {
        throw new EditorError(`invalid diamond structure: ${element.id}`);
      }
    }
    if (element.text.trim() !== "" || element.children.length !== 4) {
      throw new EditorError(`invalid diamond structure: ${element.id}`);
    }
    element.children.forEach((edge, index) => {
      if (edge.kind !== "line" || edge.id !== `${element.id}-edge-${index + 1}`) {
        throw new EditorError(`invalid diamond structure: ${element.id}`);
      }
    });
    const diamond = new DiamondShape(element.id, element.children);
    for (const attribute of ["fill", "stroke", "stroke-width"] as const) {
      const value = element.attributes.get(attribute);
      if (value !== undefined) diamond.prepareSet(attribute, value).apply();
    }
    return diamond;
  }

  private requireEdges(edges: readonly Shape[]): void {
    if (edges.some((edge) => edge.kind !== "line")) {
      throw new EditorError("diamond requires line provider");
    }
  }

  private number(value: string | undefined): number {
    const parsed = Number(value);
    if (value === undefined || value.trim() === "" || !Number.isFinite(parsed)) {
      throw new EditorError(`invalid number: ${value ?? ""}`);
    }
    return parsed;
  }

  private nonNegative(value: string | undefined, attribute: string): number {
    const parsed = this.number(value);
    if (parsed < 0) throw new EditorError(`invalid ${attribute}: ${String(parsed)}`);
    return parsed;
  }
}
