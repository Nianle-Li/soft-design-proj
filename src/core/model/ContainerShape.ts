import { Shape } from "./Shape";
import type { PreparedMove, PreparedScale, PreparedSet } from "./Shape";
import type { ShapeView } from "./TreeView";

/** Addressable composite with ordered children and pure structural permission checks. */
export abstract class ContainerShape extends Shape {
  private readonly children: Shape[] = [];

  protected override svgChildren() {
    return this.children.map((child) => child.toSvgNode());
  }

  /** Called before a direct child is moved out by a user edit. */
  assertCanDetach(child: Shape): void {
    this.childIndex(child);
  }

  /** Called before a user edit promotes this container's children. */
  assertCanUngroup(): void {
    // Ordinary containers allow ungrouping.
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
    visitor: (shape: Shape, parent: ContainerShape | null) => void,
    parent: ContainerShape | null
  ): void {
    visitor(this, parent);
    for (const child of this.children) {
      child.visitSubtree(visitor, this);
    }
  }

  get childCount(): number {
    return this.children.length;
  }

  /** Returns a stable list without exposing the mutable child array. */
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
      kind: this.kind,
      isContainer: true,
      label: this.label,
      details: [],
      children: this.children.map((child) => child.toView())
    };
  }
}
