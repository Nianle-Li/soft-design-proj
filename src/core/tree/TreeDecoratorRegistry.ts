import { EditorError } from "../model/EditorError";
import type { TreeView } from "../model/TreeView";
import type { TreeDecorationTarget, TreeDecorator } from "./TreeDecorator";

/** Owns deterministic tree-label composition without knowing individual label semantics. */
export class TreeDecoratorRegistry {
  private readonly decorators: readonly TreeDecorator[];

  constructor(decorators: readonly TreeDecorator[]) {
    const names = new Set<string>();
    for (const decorator of decorators) {
      if (names.has(decorator.name)) {
        throw new EditorError(`duplicate registration: decorators/${decorator.name}`);
      }
      names.add(decorator.name);
    }
    this.decorators = [...decorators];
  }

  labels(target: TreeDecorationTarget): readonly string[] {
    return this.decorators.flatMap((decorator) => {
      const label = decorator.decorate(target);
      if (label === undefined) return [];
      if (label.trim() === "" || /[\r\n]/u.test(label)) {
        throw new EditorError(`tree decorator ${decorator.name} returned an invalid label`);
      }
      return [label];
    });
  }

  resetBaseline(tree: TreeView): void {
    for (const decorator of this.decorators) decorator.resetBaseline?.(tree);
  }
}
