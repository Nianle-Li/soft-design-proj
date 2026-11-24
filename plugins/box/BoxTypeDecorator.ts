import type { TreeDecorationTarget, TreeDecorator } from "../../src/core/plugin-api";

/** Adds the semantic type marker without depending on BoxShape or formatted tree text. */
export class BoxTypeDecorator implements TreeDecorator {
  readonly name = "box-type-label";

  decorate(target: TreeDecorationTarget): string | undefined {
    return target.kind === "shape" && target.shape.kind === "box" ? "(box)" : undefined;
  }
}
