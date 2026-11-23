import { EditorError } from "./EditorError";
import type { PreparedSet } from "./Shape";

export interface ExplicitStyle {
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: string;
}

/** Owns only explicitly assigned paint attributes, never computed SVG defaults. */
export class PaintStyle {
  constructor(
    private fill?: string,
    private stroke?: string,
    private strokeWidth?: string
  ) {}

  get explicitFill(): string | undefined {
    return this.fill;
  }

  snapshot(): ExplicitStyle {
    const style: { fill?: string; stroke?: string; strokeWidth?: string } = {};
    if (this.fill !== undefined) style.fill = this.fill;
    if (this.stroke !== undefined) style.stroke = this.stroke;
    if (this.strokeWidth !== undefined) style.strokeWidth = this.strokeWidth;
    return style;
  }

  prepareSet(attribute: string, value: string): PreparedSet | undefined {
    switch (attribute) {
      case "fill": {
        this.requirePaint(attribute, value);
        return this.prepareValue(value, this.fill, (next) => {
          this.fill = next;
        });
      }
      case "stroke": {
        this.requirePaint(attribute, value);
        return this.prepareValue(value, this.stroke, (next) => {
          this.stroke = next;
        });
      }
      case "stroke-width": {
        const width = Number(value);
        if (value.trim() === "" || !Number.isFinite(width) || width < 0) {
          throw new EditorError(`invalid stroke-width: ${value}`);
        }
        return this.prepareValue(String(width), this.strokeWidth, (next) => {
          this.strokeWidth = next;
        });
      }
      default:
        return undefined;
    }
  }

  private prepareValue(
    value: string,
    previousValue: string | undefined,
    assign: (next: string | undefined) => void
  ): PreparedSet {
    return {
      value,
      previousValue,
      apply: () => {
        assign(value);
      },
      undo: () => {
        assign(previousValue);
      }
    };
  }

  private requirePaint(attribute: string, value: string): void {
    if (value.trim() === "") {
      throw new EditorError(`invalid ${attribute}: value must not be empty`);
    }
  }
}
