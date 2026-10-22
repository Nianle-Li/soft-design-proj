import { Shape } from "./Shape";
import type { PreparedMove, PreparedScale } from "./Shape";
import type { PreparedSet } from "./Shape";
import { PaintStyle } from "./PaintStyle";
import type { ShapeView } from "./TreeView";

export class RectShape extends Shape {
  constructor(
    id: string,
    private x: number,
    private y: number,
    private width: number,
    private height: number,
    fill?: string
  ) {
    super(id, new PaintStyle(fill));
  }

  override get kind(): string {
    return "rect";
  }

  override toSvgNode() {
    return this.svgNode([
      ["x", String(this.x)],
      ["y", String(this.y)],
      ["width", String(this.width)],
      ["height", String(this.height)]
    ]);
  }

  override prepareMove(dx: number, dy: number): PreparedMove {
    const previousX = this.x;
    const previousY = this.y;
    const x = this.translatedCoordinate(previousX, dx);
    const y = this.translatedCoordinate(previousY, dy);
    return {
      apply: () => {
        this.x = x;
        this.y = y;
        return { kind: "point", x, y };
      },
      undo: () => {
        this.x = previousX;
        this.y = previousY;
        return { kind: "point", x: previousX, y: previousY };
      }
    };
  }

  override prepareScale(factor: number): PreparedScale {
    const previous = { x: this.x, y: this.y, width: this.width, height: this.height };
    const scaled = {
      x: this.scaledGeometry(previous.x, factor),
      y: this.scaledGeometry(previous.y, factor),
      width: this.scaledGeometry(previous.width, factor),
      height: this.scaledGeometry(previous.height, factor)
    };
    return {
      apply: () => {
        this.x = scaled.x;
        this.y = scaled.y;
        this.width = scaled.width;
        this.height = scaled.height;
      },
      undo: () => {
        this.x = previous.x;
        this.y = previous.y;
        this.width = previous.width;
        this.height = previous.height;
      }
    };
  }

  protected override prepareSpecificSet(attribute: string, value: string): PreparedSet {
    switch (attribute) {
      case "x":
        return this.numericSet(value, this.x, (next) => {
          this.x = next;
        });
      case "y":
        return this.numericSet(value, this.y, (next) => {
          this.y = next;
        });
      case "width":
        return this.numericSet(value, this.width, (next) => {
          this.width = next;
        });
      case "height":
        return this.numericSet(value, this.height, (next) => {
          this.height = next;
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
      details: `x=${String(this.x)} y=${String(this.y)} w=${String(this.width)} h=${String(this.height)}${style}`,
      children: []
    };
  }
}
