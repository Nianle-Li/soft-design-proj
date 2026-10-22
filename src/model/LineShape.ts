import { Shape } from "./Shape";
import type { PreparedMove } from "./Shape";
import type { ShapeView } from "./TreeView";

export class LineShape extends Shape {
  constructor(
    id: string,
    private x1: number,
    private y1: number,
    private x2: number,
    private y2: number,
    // The course tree example displays line geometry but not its stroke.
    private readonly stroke?: string
  ) {
    super(id);
  }

  override get kind(): string {
    return "line";
  }

  override prepareMove(dx: number, dy: number): PreparedMove {
    const previous = { x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2 };
    const moved = {
      x1: this.translatedCoordinate(previous.x1, dx),
      y1: this.translatedCoordinate(previous.y1, dy),
      x2: this.translatedCoordinate(previous.x2, dx),
      y2: this.translatedCoordinate(previous.y2, dy)
    };
    return {
      apply: () => {
        this.x1 = moved.x1;
        this.y1 = moved.y1;
        this.x2 = moved.x2;
        this.y2 = moved.y2;
        return { kind: "point", x: moved.x1, y: moved.y1 };
      },
      undo: () => {
        this.x1 = previous.x1;
        this.y1 = previous.y1;
        this.x2 = previous.x2;
        this.y2 = previous.y2;
        return { kind: "point", x: previous.x1, y: previous.y1 };
      }
    };
  }

  override toView(): ShapeView {
    return {
      label: this.label,
      details: `(${String(this.x1)},${String(this.y1)}) -> (${String(this.x2)},${String(this.y2)})`,
      children: []
    };
  }
}
