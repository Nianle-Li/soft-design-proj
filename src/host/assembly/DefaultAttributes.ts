import { AttributeHandlerRegistry } from "../../core/model/AttributeHandlerRegistry";
import type { AttributeHandler } from "../../core/model/AttributeHandler";

/** Phase 1 has no specialized attribute semantics; optional plugins extend this list. */
export function createDefaultAttributeHandlers(
  optional: readonly AttributeHandler[] = []
): AttributeHandlerRegistry {
  return new AttributeHandlerRegistry(optional);
}
