import { Shape } from "./Shape";
import type { PreparedMove, PreparedScale } from "./Shape";
import type { ShapeView } from "./TreeView";

export class RectShape extends Shape {
  constructor(
    id: string,
    private x: number,
    private y: number,
    private width: number,
    private height: number,
    private readonly fill?: string
  ) {
    super(id);
  }

  override get kind(): string {
    return "rect";
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

  override toView(): ShapeView {
    const style = this.fill === undefined ? "" : ` fill=${this.fill}`;
    return {
      label: this.label,
      details: `x=${String(this.x)} y=${String(this.y)} w=${String(this.width)} h=${String(this.height)}${style}`,
      children: []
    };
  }
}
