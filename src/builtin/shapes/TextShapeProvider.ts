import { EditorError } from "../../core/plugin-api";
import type { ShapeProvider, SvgReadInput } from "../../core/plugin-api";
import { parseShapeNumber, requireShapeArgumentCount } from "./ShapeArguments";
import { applyBuiltinSvgStyle, readBuiltinSvgParameters } from "./SvgShapeArguments";
import { TextShape } from "./TextShape";

/** Owns the Phase 1 CLI argument rules for text. */
export class TextShapeProvider implements ShapeProvider {
  readonly type = "text";

  create(id: string, parameters: readonly string[]): TextShape {
    requireShapeArgumentCount(this.type, parameters, 3, 3);
    return new TextShape(
      id,
      parseShapeNumber(parameters[0]),
      parseShapeNumber(parameters[1]),
      parameters[2] ?? ""
    );
  }

  readSvg(element: SvgReadInput): TextShape {
    if (element.tag !== "text") {
      throw new EditorError(`unsupported SVG element: <${element.tag}>`);
    }
    if (element.children.length > 0) {
      throw new EditorError("unsupported child element in <text>");
    }
    const geometry = readBuiltinSvgParameters(element, ["x", "y"], true);
    const shape = this.create(element.id, [...geometry, element.text]);
    applyBuiltinSvgStyle(shape, element.attributes);
    return shape;
  }
}
