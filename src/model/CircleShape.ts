import { Shape } from "./Shape";
import type { PreparedMove, PreparedScale } from "./Shape";
import type { PreparedSet } from "./Shape";
import { PaintStyle } from "./PaintStyle";
import type { ShapeView } from "./TreeView";

export class CircleShape extends Shape {
  constructor(
    id: string,
    private cx: number,
    private cy: number,
    private radius: number,
    fill?: string
  ) {
    super(id, new PaintStyle(fill));
  }

  override get kind(): string {
    return "circle";
  }

  protected override geometryAttributes(): readonly (readonly [string, string])[] {
    return [
      ["cx", String(this.cx)],
      ["cy", String(this.cy)],
      ["r", String(this.radius)]
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
    const previous = { cx: this.cx, cy: this.cy, radius: this.radius };
    const scaled = {
      cx: this.scaledGeometry(previous.cx, factor),
      cy: this.scaledGeometry(previous.cy, factor),
      radius: this.scaledGeometry(previous.radius, factor)
    };
    return {
      apply: () => {
        this.cx = scaled.cx;
        this.cy = scaled.cy;
        this.radius = scaled.radius;
      },
      undo: () => {
        this.cx = previous.cx;
        this.cy = previous.cy;
        this.radius = previous.radius;
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
      case "r":
        return this.numericSet(value, this.radius, (next) => {
          this.radius = next;
        });
      default:
        return this.unknownAttribute(attribute);
    }
  }

  override toView(): ShapeView {
    const fill = this.style.explicitFill;
    const style = fill === undefined ? "" : ` fill=${fill}`;
    return {
      label: this.label,
      details: `cx=${String(this.cx)} cy=${String(this.cy)} r=${String(this.radius)}${style}`,
      children: []
    };
  }
}
