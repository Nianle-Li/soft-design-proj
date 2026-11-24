import { ContainerShape, EditorError } from "../../src/core/plugin-api";
import type { PreparedSet, Shape, ShapeView } from "../../src/core/plugin-api";

/** Composite box owns its frame and title while remaining open to nested content. */
export class BoxShape extends ContainerShape {
  constructor(
    id: string,
    private readonly frame: Shape,
    private readonly title: Shape
  ) {
    super(id);
    this.insertChild(0, frame);
    this.insertChild(1, title);
  }

  override get kind(): string {
    return "box";
  }

  override get label(): string {
    return `box#${this.id}`;
  }

  override assertCanDetach(child: Shape): void {
    super.assertCanDetach(child);
    if (child === this.frame || child === this.title) {
      throw new EditorError(`cannot detach required box part: ${child.id}`);
    }
  }

  override assertCanUngroup(): void {
    throw new EditorError(`cannot ungroup composite shape: ${this.id}`);
  }

  prepareFill(value: string): PreparedSet {
    const plan = this.frame.prepareSet("fill", value);
    return { ...plan, effect: { kind: "propagated", targetId: this.frame.id } };
  }

  prepareLabel(value: string): PreparedSet {
    const plan = this.title.prepareSet("text", value);
    return { ...plan, effect: { kind: "text" } };
  }

  override toView(): ShapeView {
    return { ...super.toView(), kind: "box", label: `g#${this.id}` };
  }

  override toSvgNode() {
    const attributes: [string, string][] = [
      ["id", this.id],
      ["data-kind", "box"]
    ];
    const style = this.explicitStyle();
    if (style.fill !== undefined) attributes.push(["fill", style.fill]);
    if (style.stroke !== undefined) attributes.push(["stroke", style.stroke]);
    if (style.strokeWidth !== undefined) attributes.push(["stroke-width", style.strokeWidth]);
    return { tag: "g", attributes, children: this.svgChildren() };
  }

  protected override geometryAttributes(): readonly (readonly [string, string])[] {
    return [];
  }
}
