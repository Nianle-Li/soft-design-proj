import type { ShapeView, TreeView } from "../model/TreeView";

export type TreeDecorationTarget =
  Readonly<{ kind: "canvas"; tree: TreeView }> | Readonly<{ kind: "shape"; shape: ShapeView }>;

/** Contributes one semantic line label and owns any document-scoped label state. */
export interface TreeDecorator {
  readonly name: string;

  decorate(target: TreeDecorationTarget): string | undefined;

  /** Stateful decorators may establish state after a successful init, read, or save. */
  resetBaseline?(tree: TreeView): void;
}
