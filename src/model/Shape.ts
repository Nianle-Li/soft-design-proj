import { EditorError } from "./EditorError";
import type { ShapeView } from "./TreeView";
import type { GroupShape } from "./GroupShape";
import { PaintStyle } from "./PaintStyle";
import type { ExplicitStyle } from "./PaintStyle";

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
    assign: (next: number) => void
  ): PreparedSet {
    const next = Number(value);
    if (value.trim() === "" || !Number.isFinite(next)) {
      throw new EditorError(`invalid number: ${value}`);
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
