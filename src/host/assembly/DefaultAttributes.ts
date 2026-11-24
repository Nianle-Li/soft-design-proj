import { AttributeHandlerRegistry } from "../../core/model/AttributeHandlerRegistry";

/** Phase 1 has no specialized attribute semantics; optional plugins extend this list. */
export function createDefaultAttributeHandlers(): AttributeHandlerRegistry {
  return new AttributeHandlerRegistry([]);
}
