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
