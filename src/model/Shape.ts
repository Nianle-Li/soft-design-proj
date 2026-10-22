import type { ShapeView } from "./TreeView";

/** Common addressable SVG element; each concrete shape owns its description. */
export abstract class Shape {
  constructor(readonly id: string) {}

  abstract get kind(): string;

  get label(): string {
    return `${this.kind}#${this.id}`;
  }

  abstract toView(): ShapeView;
}
