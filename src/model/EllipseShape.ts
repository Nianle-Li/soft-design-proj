import { Shape } from "./Shape";
import type { PreparedMove } from "./Shape";
import type { ShapeView } from "./TreeView";

export class EllipseShape extends Shape {
  constructor(
    id: string,
    private cx: number,
    private cy: number,
    private readonly rx: number,
    private readonly ry: number,
    private readonly fill?: string
  ) {
    super(id);
  }

  override get kind(): string {
    return "ellipse";
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

  override toView(): ShapeView {
    const style = this.fill === undefined ? "" : ` fill=${this.fill}`;
    return {
      label: this.label,
      details: `cx=${String(this.cx)} cy=${String(this.cy)} rx=${String(this.rx)} ry=${String(this.ry)}${style}`,
      children: []
    };
  }
}
