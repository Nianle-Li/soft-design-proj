import type { PreparedSet, Shape } from "./Shape";

/** Defines one named attribute semantic without owning document history. */
export interface AttributeHandler {
  readonly name: string;

  /** Selection must be side-effect free. */
  handles(shape: Shape, attribute: string): boolean;

  /** Preparation validates and returns a reversible plan without applying it. */
  prepare(shape: Shape, attribute: string, value: string): PreparedSet;
}
