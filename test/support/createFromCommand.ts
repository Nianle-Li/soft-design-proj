import { ShapeFactory } from "../../src/model/ShapeFactory";
import type { CreationReceipt, SvgDocument } from "../../src/model/SvgDocument";

/** Converts command syntax at the test boundary; the document receives a typed request. */
export function createFromCommand(
  document: SvgDocument,
  type: string,
  id: string,
  parameters: readonly string[],
  parentId?: string
): CreationReceipt {
  return document.create(new ShapeFactory().parseCommand(type, id, parameters), parentId);
}
