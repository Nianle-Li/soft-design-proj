import type {
  ShapeView,
  TreeDecorationTarget,
  TreeDecorator,
  TreeView
} from "../../src/core/plugin-api";

/** Compares semantic projections with the last successful persistence boundary. */
export class ModifiedStarDecorator implements TreeDecorator {
  readonly name = "modified-star";
  private baselineTree?: string;
  private readonly baselineShapes = new Map<string, string>();

  decorate(target: TreeDecorationTarget): string | undefined {
    const modified =
      target.kind === "canvas"
        ? this.treeFingerprint(target.tree) !== this.baselineTree
        : this.shapeFingerprint(target.shape) !== this.baselineShapes.get(target.shape.label);
    return modified ? "*" : undefined;
  }

  resetBaseline(tree: TreeView): void {
    this.baselineTree = this.treeFingerprint(tree);
    this.baselineShapes.clear();
    const visit = (shape: ShapeView): void => {
      this.baselineShapes.set(shape.label, this.shapeFingerprint(shape));
      shape.children.forEach(visit);
    };
    tree.roots.forEach(visit);
  }

  private treeFingerprint(tree: TreeView): string {
    return JSON.stringify(tree);
  }

  private shapeFingerprint(shape: ShapeView): string {
    return JSON.stringify(shape);
  }
}
