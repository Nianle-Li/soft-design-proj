/** Detached SVG data for persistence, not a mutable model or an undo snapshot. */
export interface SvgNodeView {
  readonly tag: string;
  readonly attributes: readonly (readonly [string, string])[];
  readonly text?: string;
  readonly children: readonly SvgNodeView[];
}

export interface SvgDocumentView {
  readonly width: number;
  readonly height: number;
  readonly roots: readonly SvgNodeView[];
}
