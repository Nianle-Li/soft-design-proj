import type { Shape } from "./Shape";

/** SVG adapter output; providers see no parser or mutable document objects. */
export interface SvgReadInput {
  readonly tag: string;
  readonly id: string;
  readonly attributes: ReadonlyMap<string, string>;
  readonly text: string;
  readonly children: readonly Shape[];
}

/** Lets a provider compose other registered shapes without knowing their concrete classes. */
export interface ShapeCreationContext {
  create(type: string, id: string, parameters: readonly string[]): Shape;
}

/** Constructs a detached shape; the document validates and attaches the returned tree. */
export interface ShapeProvider {
  readonly type: string;
  create(id: string, parameters: readonly string[], context: ShapeCreationContext): Shape;
  /** Creation-only providers cannot read their registered SVG type. */
  readSvg?(element: SvgReadInput): Shape;
}
