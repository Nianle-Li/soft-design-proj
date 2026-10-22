import { Shape } from "./Shape";
import type { ShapeView } from "./TreeView";

/** Composite shape; child order is SVG painting order. */
export class GroupShape extends Shape {
  private readonly children: Shape[] = [];

  override get kind(): string {
    return "g";
  }

  insertChild(index: number, shape: Shape): void {
    this.children.splice(index, 0, shape);
  }

  removeChild(shape: Shape): number {
    const index = this.children.indexOf(shape);
    if (index < 0) {
      throw new Error("shape is not a child of this group");
    }
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

  override toView(): ShapeView {
    return {
      label: this.label,
      details: "",
      children: this.children.map((child) => child.toView())
    };
  }
}
