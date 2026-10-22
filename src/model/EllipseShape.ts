import { Shape } from "./Shape";
import type { ShapeView } from "./TreeView";

export class EllipseShape extends Shape {
  constructor(
    id: string,
    private readonly cx: number,
    private readonly cy: number,
    private readonly rx: number,
    private readonly ry: number,
    private readonly fill?: string
  ) {
    super(id);
  }

  override get kind(): string {
    return "ellipse";
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
