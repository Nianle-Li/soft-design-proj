import type { AttributeHandler } from "./AttributeHandler";
import { EditorError } from "./EditorError";
import type { PreparedSet, Shape } from "./Shape";

/** Selects exactly one attribute semantic or leaves Phase 1 handling in charge. */
export class AttributeHandlerRegistry {
  private readonly handlers: readonly AttributeHandler[];

  constructor(handlers: readonly AttributeHandler[]) {
    const names = new Set<string>();
    for (const handler of handlers) {
      if (names.has(handler.name)) {
        throw new EditorError(`duplicate registration: attributes/${handler.name}`);
      }
      names.add(handler.name);
    }
    this.handlers = [...handlers];
  }

  prepare(shape: Shape, attribute: string, value: string): PreparedSet | undefined {
    const matches = this.handlers.filter((handler) => handler.handles(shape, attribute));
    if (matches.length === 0) return undefined;
    if (matches.length > 1) {
      throw new EditorError(
        `multiple attribute handlers for ${shape.label}.${attribute}: ${matches
          .map((handler) => handler.name)
          .join(", ")}`
      );
    }
    return matches[0]?.prepare(shape, attribute, value);
  }
}
