import { EditorError } from "./EditorError";
import type { ShapeDetailsView, ShapeView } from "./TreeView";
import type { GroupShape } from "./GroupShape";
import { PaintStyle } from "./PaintStyle";
import type { ExplicitStyle } from "./PaintStyle";
import type { SvgNodeView } from "./SvgNodeView";

export type MoveLocation =
  { readonly kind: "point"; readonly x: number; readonly y: number } | { readonly kind: "offset" };

export interface PreparedMove {
  apply(): MoveLocation;
  undo(): MoveLocation;
}

export interface PreparedScale {
  apply(): void;
  undo(): void;
}

export interface PreparedSet {
  readonly value: string;
  readonly previousValue: string | undefined;
  apply(): void;
  undo(): void;
}

/** Common addressable SVG element; each concrete shape owns its description. */
export abstract class Shape {
  constructor(
    readonly id: string,
    protected readonly style = new PaintStyle()
  ) {}

  abstract get kind(): string;

  get label(): string {
    return `${this.kind}#${this.id}`;
  }

  abstract toView(): ShapeView;

  toSvgNode(): SvgNodeView {
    return this.svgNode(this.geometryAttributes(), this.svgChildren(), this.textContent());
  }

  toDetailsView(parentLabel: string): ShapeDetailsView {
    const details = {
      label: this.label,
      parentLabel,
      geometry: this.geometryAttributes(),
      style: this.style.snapshot()
    };
    const text = this.textContent();
    return text === undefined ? details : { ...details, text };
  }

  /** Shape-specific attributes have one source for inspection and SVG output. */
  protected abstract geometryAttributes(): readonly (readonly [string, string])[];

  protected svgChildren(): readonly SvgNodeView[] {
    return [];
  }

  protected textContent(): string | undefined {
    return undefined;
  }

  /** Keeps optional paint attributes absent unless explicitly assigned. */
  protected svgNode(
    geometry: readonly (readonly [string, string])[],
    children: readonly SvgNodeView[] = [],
    text?: string
  ): SvgNodeView {
    const attributes: [string, string][] = [
      ["id", this.id],
      ...geometry.map(([key, value]) => [key, value] as [string, string])
    ];
    const style = this.style.snapshot();
    if (style.fill !== undefined) attributes.push(["fill", style.fill]);
    if (style.stroke !== undefined) attributes.push(["stroke", style.stroke]);
    if (style.strokeWidth !== undefined) attributes.push(["stroke-width", style.strokeWidth]);
    return text === undefined
      ? { tag: this.kind, attributes, children }
      : { tag: this.kind, attributes, text, children };
  }

  /** Prepares every affected coordinate before any part of a composite moves. */
  abstract prepareMove(dx: number, dy: number): PreparedMove;

  /** Prepares all geometry before any part of a composite is scaled. */
  abstract prepareScale(factor: number): PreparedScale;

  /** Prepares a single explicit attribute change without touching the shape. */
  prepareSet(attribute: string, value: string): PreparedSet {
    return this.style.prepareSet(attribute, value) ?? this.prepareSpecificSet(attribute, value);
  }

  explicitStyle(): ExplicitStyle {
    return this.style.snapshot();
  }

  protected abstract prepareSpecificSet(attribute: string, value: string): PreparedSet;

  protected numericSet(
    value: string,
    previous: number,
    assign: (next: number) => void,
    nonNegativeAttribute?: string
  ): PreparedSet {
    const next = Number(value);
    if (value.trim() === "" || !Number.isFinite(next)) {
      throw new EditorError(`invalid number: ${value}`);
    }
    if (nonNegativeAttribute !== undefined) {
      this.requireNonNegative(next, nonNegativeAttribute);
    }
    return {
      value: String(next),
      previousValue: String(previous),
      apply: () => {
        assign(next);
      },
      undo: () => {
        assign(previous);
      }
    };
  }

  /** SVG dimensions and radii may be zero, but cannot be negative. */
  protected requireNonNegative(value: number, attribute: string): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new EditorError(`invalid ${attribute}: ${String(value)}`);
    }
  }

  protected unknownAttribute(attribute: string): never {
    throw new EditorError(`unknown attribute: ${attribute}`);
  }

  protected translatedCoordinate(value: number, delta: number): number {
    const moved = value + delta;
    if (!Number.isFinite(moved)) {
      throw new EditorError("move would produce non-finite coordinates");
    }
    return moved;
  }

  protected scaledGeometry(value: number, factor: number): number {
    const scaled = value * factor;
    if (!Number.isFinite(scaled)) {
      throw new EditorError("scale would produce non-finite geometry");
    }
    return scaled;
  }

  /** Visits the live subtree so the document can maintain its id and parent index. */
  visitSubtree(
    visitor: (shape: Shape, parent: GroupShape | null) => void,
    parent: GroupShape | null
  ): void {
    visitor(this, parent);
  }
}
