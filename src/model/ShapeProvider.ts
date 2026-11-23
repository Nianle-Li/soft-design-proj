import type { Shape } from "./Shape";

/** Lets a provider compose other registered shapes without knowing their concrete classes. */
export interface ShapeCreationContext {
  create(type: string, id: string, parameters: readonly string[]): Shape;
}

/** Constructs a detached shape; the document validates and attaches the returned tree. */
export interface ShapeProvider {
  readonly type: string;
  create(id: string, parameters: readonly string[], context: ShapeCreationContext): Shape;
}
