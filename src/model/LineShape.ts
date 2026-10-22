import { Shape } from "./Shape";
import type { ShapeView } from "./TreeView";

export class LineShape extends Shape {
  constructor(
    id: string,
    private readonly x1: number,
    private readonly y1: number,
    private readonly x2: number,
    private readonly y2: number,
    // The course tree example displays line geometry but not its stroke.
    private readonly stroke?: string
  ) {
    super(id);
  }

  override get kind(): string {
    return "line";
  }

  override toView(): ShapeView {
    return {
      label: this.label,
      details: `(${String(this.x1)},${String(this.y1)}) -> (${String(this.x2)},${String(this.y2)})`,
      children: []
    };
  }
}
