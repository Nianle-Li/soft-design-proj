import type { ShapeView } from "./TreeView";
import type { GroupShape } from "./GroupShape";

/** Common addressable SVG element; each concrete shape owns its description. */
export abstract class Shape {
  constructor(readonly id: string) {}

  abstract get kind(): string;

  get label(): string {
    return `${this.kind}#${this.id}`;
  }

  abstract toView(): ShapeView;

  /** Visits the live subtree so the document can maintain its id and parent index. */
  visitSubtree(
    visitor: (shape: Shape, parent: GroupShape | null) => void,
    parent: GroupShape | null
  ): void {
    visitor(this, parent);
  }
}
