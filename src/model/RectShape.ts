import { Shape } from "./Shape";
import type { ShapeView } from "./TreeView";

export class RectShape extends Shape {
  constructor(
    id: string,
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly height: number,
    private readonly fill?: string
  ) {
    super(id);
  }

  override get kind(): string {
    return "rect";
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
