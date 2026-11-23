import { EditorError } from "../../core/plugin-api";
import type { ShapeProvider, SvgReadInput } from "../../core/plugin-api";
import { LineShape } from "./LineShape";
import { parseShapeNumber, requireShapeArgumentCount } from "./ShapeArguments";
import { applyBuiltinSvgStyle, readBuiltinSvgParameters } from "./SvgShapeArguments";

/** Owns the Phase 1 CLI argument rules for lines. */
export class LineShapeProvider implements ShapeProvider {
  readonly type = "line";

  create(id: string, parameters: readonly string[]): LineShape {
    requireShapeArgumentCount(this.type, parameters, 4, 5);
    const shape = new LineShape(
      id,
      parseShapeNumber(parameters[0]),
      parseShapeNumber(parameters[1]),
      parseShapeNumber(parameters[2]),
      parseShapeNumber(parameters[3])
    );
    const stroke = parameters[4];
    if (stroke !== undefined) shape.prepareSet("stroke", stroke).apply();
    return shape;
  }

  readSvg(element: SvgReadInput): LineShape {
    if (element.tag !== "line") {
      throw new EditorError(`unsupported SVG element: <${element.tag}>`);
    }
    const shape = this.create(
      element.id,
      readBuiltinSvgParameters(element, ["x1", "y1", "x2", "y2"])
    );
    applyBuiltinSvgStyle(shape, element.attributes);
    if (element.children.length > 0) {
      throw new EditorError(`no such container: ${element.id}`);
    }
    return shape;
  }
}
