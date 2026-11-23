import { ContainerShape } from "../core/model/ContainerShape";

/** Ordinary SVG group; its child order is SVG painting order. */
export class GroupShape extends ContainerShape {
  override get kind(): string {
    return "g";
  }

  protected override geometryAttributes(): readonly (readonly [string, string])[] {
    return [];
  }
}
