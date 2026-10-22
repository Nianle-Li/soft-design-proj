import { Shape } from "./Shape";
import type { PreparedMove } from "./Shape";
import type { ShapeView } from "./TreeView";

export class TextShape extends Shape {
  constructor(
    id: string,
    private x: number,
    private y: number,
    private readonly content: string
  ) {
    super(id);
  }

  override get kind(): string {
    return "text";
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
    return {
      label: this.label,
      details: `(${String(this.x)},${String(this.y)}) "${this.content}"`,
      children: []
    };
  }
}
