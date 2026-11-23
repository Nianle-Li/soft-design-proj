import { EditorError } from "../../core/plugin-api";
import type { ShapeProvider, SvgReadInput } from "../../core/plugin-api";
import { CircleShape } from "./CircleShape";
import { parseShapeNumber, requireShapeArgumentCount } from "./ShapeArguments";
import { applyBuiltinSvgStyle, readBuiltinSvgParameters } from "./SvgShapeArguments";

/** Owns the Phase 1 CLI argument rules for circles. */
export class CircleShapeProvider implements ShapeProvider {
  readonly type = "circle";

  create(id: string, parameters: readonly string[]): CircleShape {
    requireShapeArgumentCount(this.type, parameters, 3, 4);
    const shape = new CircleShape(
      id,
      parseShapeNumber(parameters[0]),
      parseShapeNumber(parameters[1]),
      parseShapeNumber(parameters[2])
    );
    const fill = parameters[3];
    if (fill !== undefined) shape.prepareSet("fill", fill).apply();
    return shape;
  }

  readSvg(element: SvgReadInput): CircleShape {
    if (element.tag !== "circle") {
      throw new EditorError(`unsupported SVG element: <${element.tag}>`);
    }
    const shape = this.create(element.id, readBuiltinSvgParameters(element, ["cx", "cy", "r"]));
    applyBuiltinSvgStyle(shape, element.attributes);
    if (element.children.length > 0) {
      throw new EditorError(`no such container: ${element.id}`);
    }
    return shape;
  }
}
