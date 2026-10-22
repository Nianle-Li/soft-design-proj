import { Shape } from "./Shape";
import type { PreparedMove, PreparedScale } from "./Shape";
import type { PreparedSet } from "./Shape";
import type { ShapeView } from "./TreeView";

/** Composite shape; child order is SVG painting order. */
export class GroupShape extends Shape {
  private readonly children: Shape[] = [];

  override get kind(): string {
    return "g";
  }

  override toSvgNode() {
    return this.svgNode(
      [],
      this.children.map((child) => child.toSvgNode())
    );
  }

  insertChild(index: number, shape: Shape): void {
    this.children.splice(index, 0, shape);
  }

  childIndex(shape: Shape): number {
    const index = this.children.indexOf(shape);
    if (index < 0) {
      throw new Error("shape is not a child of this group");
    }
    return index;
  }

  removeChild(shape: Shape): number {
    const index = this.childIndex(shape);
    this.children.splice(index, 1);
    return index;
  }

  override visitSubtree(
    visitor: (shape: Shape, parent: GroupShape | null) => void,
    parent: GroupShape | null
  ): void {
    visitor(this, parent);
    for (const child of this.children) {
      child.visitSubtree(visitor, this);
    }
  }

  get childCount(): number {
    return this.children.length;
  }

  /** Returns a stable list of direct children without exposing the mutable child array. */
  directChildren(): readonly Shape[] {
    return [...this.children];
  }

  override prepareMove(dx: number, dy: number): PreparedMove {
    const children = this.children.map((child) => child.prepareMove(dx, dy));
    return {
      apply: () => {
        children.forEach((child) => child.apply());
        return { kind: "offset" };
      },
      undo: () => {
        children.forEach((child) => child.undo());
        return { kind: "offset" };
      }
    };
  }

  override prepareScale(factor: number): PreparedScale {
    const children = this.children.map((child) => child.prepareScale(factor));
    return {
      apply: () => {
        children.forEach((child) => {
          child.apply();
        });
      },
      undo: () => {
        children.forEach((child) => {
          child.undo();
        });
      }
    };
  }

  protected override prepareSpecificSet(attribute: string): PreparedSet {
    return this.unknownAttribute(attribute);
  }

  override toView(): ShapeView {
    return {
      label: this.label,
      details: "",
      children: this.children.map((child) => child.toView())
    };
  }
}
