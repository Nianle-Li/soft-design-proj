import type { ExplicitStyle } from "./PaintStyle";

/** A detached projection: callers cannot mutate the document through this view. */
export interface ShapeView {
  readonly label: string;
  readonly details: string;
  readonly children: readonly ShapeView[];
}

export interface TreeView {
  readonly width: number;
  readonly height: number;
  readonly roots: readonly ShapeView[];
}

/** One shape's own facts; children and model objects stay behind the document boundary. */
export interface ShapeDetailsView {
  readonly label: string;
  readonly parentLabel: string;
  readonly geometry: readonly (readonly [string, string])[];
  readonly style: ExplicitStyle;
  readonly text?: string;
}
