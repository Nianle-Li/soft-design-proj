import { TreeDecoratorRegistry } from "../../core/tree/TreeDecoratorRegistry";

/** Phase 1 tree output has no optional line labels. */
export function createDefaultTreeDecorators(): TreeDecoratorRegistry {
  return new TreeDecoratorRegistry([]);
}
