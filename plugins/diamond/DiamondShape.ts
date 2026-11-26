import { ContainerShape, EditorError } from "../../src/core/plugin-api";
import type { Shape } from "../../src/core/plugin-api";

/** Composite decision shape whose four edges form one protected domain object. */
export class DiamondShape extends ContainerShape {
  constructor(
    id: string,
    private readonly edges: readonly Shape[]
  ) {
    super(id);
    for (const edge of edges) this.insertChild(this.childCount, edge);
  }

  override get kind(): string {
    return "diamond";
  }

  override assertCanDetach(child: Shape): void {
    super.assertCanDetach(child);
    if (this.edges.includes(child)) {
      throw new EditorError(`cannot detach required diamond part: ${child.id}`);
    }
  }

  override assertCanUngroup(): void {
    throw new EditorError(`cannot ungroup composite shape: ${this.id}`);
  }

  override toSvgNode() {
    const attributes: [string, string][] = [
      ["id", this.id],
      ["data-kind", "diamond"]
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
