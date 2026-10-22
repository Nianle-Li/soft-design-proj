import { Shape } from "./Shape";
import type { PreparedMove, PreparedScale } from "./Shape";
import type { PreparedSet } from "./Shape";
import { PaintStyle } from "./PaintStyle";
import type { ShapeView } from "./TreeView";

export class EllipseShape extends Shape {
  constructor(
    id: string,
    private cx: number,
    private cy: number,
    private rx: number,
    private ry: number,
    fill?: string
  ) {
    super(id, new PaintStyle(fill));
    this.requireNonNegative(rx, "rx");
    this.requireNonNegative(ry, "ry");
  }

  override get kind(): string {
    return "ellipse";
  }

  protected override geometryAttributes(): readonly (readonly [string, string])[] {
    return [
      ["cx", String(this.cx)],
      ["cy", String(this.cy)],
      ["rx", String(this.rx)],
      ["ry", String(this.ry)]
    ];
  }

  override prepareMove(dx: number, dy: number): PreparedMove {
    const previousX = this.cx;
    const previousY = this.cy;
    const x = this.translatedCoordinate(previousX, dx);
    const y = this.translatedCoordinate(previousY, dy);
    return {
      apply: () => {
        this.cx = x;
        this.cy = y;
        return { kind: "point", x, y };
      },
      undo: () => {
        this.cx = previousX;
        this.cy = previousY;
        return { kind: "point", x: previousX, y: previousY };
      }
    };
  }

  override prepareScale(factor: number): PreparedScale {
    const previous = { cx: this.cx, cy: this.cy, rx: this.rx, ry: this.ry };
    const scaled = {
      cx: this.scaledGeometry(previous.cx, factor),
      cy: this.scaledGeometry(previous.cy, factor),
      rx: this.scaledGeometry(previous.rx, factor),
      ry: this.scaledGeometry(previous.ry, factor)
    };
    return {
      apply: () => {
        this.cx = scaled.cx;
        this.cy = scaled.cy;
        this.rx = scaled.rx;
        this.ry = scaled.ry;
      },
      undo: () => {
        this.cx = previous.cx;
        this.cy = previous.cy;
        this.rx = previous.rx;
        this.ry = previous.ry;
      }
    };
  }

  protected override prepareSpecificSet(attribute: string, value: string): PreparedSet {
    switch (attribute) {
      case "cx":
        return this.numericSet(value, this.cx, (next) => {
          this.cx = next;
        });
      case "cy":
        return this.numericSet(value, this.cy, (next) => {
          this.cy = next;
        });
      case "rx":
        return this.numericSet(
          value,
          this.rx,
          (next) => {
            this.rx = next;
          },
          "rx"
        );
      case "ry":
        return this.numericSet(
          value,
          this.ry,
          (next) => {
            this.ry = next;
          },
          "ry"
        );
      default:
        return this.unknownAttribute(attribute);
    }
  }

  override toView(): ShapeView {
    const fill = this.style.explicitFill;
    const style = fill === undefined ? "" : ` fill=${fill}`;
    return {
      label: this.label,
      details: `cx=${String(this.cx)} cy=${String(this.cy)} rx=${String(this.rx)} ry=${String(this.ry)}${style}`,
      children: []
    };
  }
}
