import { TreeDecoratorRegistry } from "../../core/tree/TreeDecoratorRegistry";
import type { TreeDecorator } from "../../core/tree/TreeDecorator";

/** Phase 1 tree output has no optional line labels. */
export function createDefaultTreeDecorators(
  optional: readonly TreeDecorator[] = []
): TreeDecoratorRegistry {
  return new TreeDecoratorRegistry(optional);
}
