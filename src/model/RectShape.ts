import { Shape } from "./Shape";
import type { PreparedMove } from "./Shape";
import type { ShapeView } from "./TreeView";

export class RectShape extends Shape {
  constructor(
    id: string,
    private x: number,
    private y: number,
    private readonly width: number,
    private readonly height: number,
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

  override toView(): ShapeView {
    const style = this.fill === undefined ? "" : ` fill=${this.fill}`;
    return {
      label: this.label,
      details: `x=${String(this.x)} y=${String(this.y)} w=${String(this.width)} h=${String(this.height)}${style}`,
      children: []
    };
  }
}
