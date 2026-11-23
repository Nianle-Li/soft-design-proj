import { EditorError } from "../../core/plugin-api";
import type { ShapeProvider, SvgReadInput } from "../../core/plugin-api";
import { EllipseShape } from "./EllipseShape";
import { parseShapeNumber, requireShapeArgumentCount } from "./ShapeArguments";
import { applyBuiltinSvgStyle, readBuiltinSvgParameters } from "./SvgShapeArguments";

/** Owns the Phase 1 CLI argument rules for ellipses. */
export class EllipseShapeProvider implements ShapeProvider {
  readonly type = "ellipse";

  create(id: string, parameters: readonly string[]): EllipseShape {
    requireShapeArgumentCount(this.type, parameters, 4, 5);
    const shape = new EllipseShape(
      id,
      parseShapeNumber(parameters[0]),
      parseShapeNumber(parameters[1]),
      parseShapeNumber(parameters[2]),
      parseShapeNumber(parameters[3])
    );
    const fill = parameters[4];
    if (fill !== undefined) shape.prepareSet("fill", fill).apply();
    return shape;
  }

  readSvg(element: SvgReadInput): EllipseShape {
    if (element.tag !== "ellipse") {
      throw new EditorError(`unsupported SVG element: <${element.tag}>`);
    }
    const shape = this.create(
      element.id,
      readBuiltinSvgParameters(element, ["cx", "cy", "rx", "ry"])
    );
    applyBuiltinSvgStyle(shape, element.attributes);
    if (element.children.length > 0) {
      throw new EditorError(`no such container: ${element.id}`);
    }
    return shape;
  }
}
