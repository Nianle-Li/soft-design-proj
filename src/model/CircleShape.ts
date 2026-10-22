import { Shape } from "./Shape";
import type { ShapeView } from "./TreeView";

export class CircleShape extends Shape {
  constructor(
    id: string,
    private readonly cx: number,
    private readonly cy: number,
    private readonly radius: number,
    private readonly fill?: string
  ) {
    super(id);
  }

  override get kind(): string {
    return "circle";
  }

  override toView(): ShapeView {
    const style = this.fill === undefined ? "" : ` fill=${this.fill}`;
    return {
      label: this.label,
      details: `cx=${String(this.cx)} cy=${String(this.cy)} r=${String(this.radius)}${style}`,
      children: []
    };
  }
}
