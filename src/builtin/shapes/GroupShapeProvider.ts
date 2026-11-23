import { EditorError } from "../../core/plugin-api";
import type { ShapeProvider, SvgReadInput } from "../../core/plugin-api";
import { GroupShape } from "./GroupShape";
import { applyBuiltinSvgStyle, readBuiltinSvgParameters } from "./SvgShapeArguments";

/** Constructs an ordinary SVG group from the Phase 1 create syntax. */
export class GroupShapeProvider implements ShapeProvider {
  readonly type = "g";

  create(id: string, parameters: readonly string[]): GroupShape {
    if (parameters.length !== 0) {
      throw new EditorError("invalid arguments for g");
    }
    return new GroupShape(id);
  }

  readSvg(element: SvgReadInput): GroupShape {
    if (element.tag !== "g") {
      throw new EditorError(`unsupported SVG element: <${element.tag}>`);
    }
    readBuiltinSvgParameters(element, []);
    const group = new GroupShape(element.id);
    applyBuiltinSvgStyle(group, element.attributes);
    for (const child of element.children) group.insertChild(group.childCount, child);
    return group;
  }
}
