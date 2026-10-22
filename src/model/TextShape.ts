import { Shape } from "./Shape";
import type { ShapeView } from "./TreeView";

export class TextShape extends Shape {
  constructor(
    id: string,
    private readonly x: number,
    private readonly y: number,
    private readonly content: string
  ) {
    super(id);
  }

  override get kind(): string {
    return "text";
  }

  override toView(): ShapeView {
    return {
      label: this.label,
      details: `(${String(this.x)},${String(this.y)}) "${this.content}"`,
      children: []
    };
  }
}
