import { EditorError } from "./EditorError";
import type { ShapeView } from "./TreeView";
import type { GroupShape } from "./GroupShape";

export type MoveLocation =
  { readonly kind: "point"; readonly x: number; readonly y: number } | { readonly kind: "offset" };

export interface PreparedMove {
  apply(): MoveLocation;
  undo(): MoveLocation;
}

/** Common addressable SVG element; each concrete shape owns its description. */
export abstract class Shape {
  constructor(readonly id: string) {}

  abstract get kind(): string;

  get label(): string {
    return `${this.kind}#${this.id}`;
  }

  abstract toView(): ShapeView;

  /** Prepares every affected coordinate before any part of a composite moves. */
  abstract prepareMove(dx: number, dy: number): PreparedMove;

  protected translatedCoordinate(value: number, delta: number): number {
    const moved = value + delta;
    if (!Number.isFinite(moved)) {
      throw new EditorError("move would produce non-finite coordinates");
    }
    return moved;
  }

  /** Visits the live subtree so the document can maintain its id and parent index. */
  visitSubtree(
    visitor: (shape: Shape, parent: GroupShape | null) => void,
    parent: GroupShape | null
  ): void {
    visitor(this, parent);
  }
}
