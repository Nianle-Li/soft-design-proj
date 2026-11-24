import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";
import type { ShapeProviderRegistry } from "../../src/core/model/ShapeProviderRegistry";
import type { CreationReceipt, SvgDocument } from "../../src/core/model/SvgDocument";

/** Builds a detached candidate through the same provider contract as CLI creation. */
export function createFromCommand(
  document: SvgDocument,
  type: string,
  id: string,
  parameters: readonly string[],
  parentId?: string,
  providers: ShapeProviderRegistry = createDefaultShapeProviders()
): CreationReceipt {
  return document.createCandidate(providers.create(type, id, parameters), parentId);
}
