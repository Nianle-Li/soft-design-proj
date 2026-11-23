import { describe, expect, it } from "vitest";
import { GroupShape } from "../../src/builtin/shapes/GroupShape";
import { RectShape } from "../../src/builtin/shapes/RectShape";
import type { SvgReadInput, ShapeProvider } from "../../src/core/plugin-api";
import { ShapeProviderRegistry } from "../../src/core/model/ShapeProviderRegistry";

const input = (children: readonly RectShape[] = []): SvgReadInput => ({
  tag: "g",
  id: "frame",
  attributes: new Map([
    ["id", "frame"],
    ["data-kind", "frame"]
  ]),
  text: "",
  children
});

describe("SVG shape reader contract", () => {
  it("passes neutral input and already built children to the selected provider", () => {
    const child = new RectShape("body", 1, 2, 3, 4);
    const seen: SvgReadInput[] = [];
    const provider: ShapeProvider = {
      type: "frame",
      create: (id) => new GroupShape(id),
      readSvg(element) {
        seen.push(element);
        const frame = new GroupShape(element.id);
        for (const member of element.children) frame.insertChild(frame.childCount, member);
        return frame;
      }
    };
    const registry = new ShapeProviderRegistry([provider]);

    expect(registry.hasSvgReader("frame")).toBe(true);
    expect(registry.hasSvgReader("missing")).toBe(false);
    const element = input([child]);
    const shape = registry.readSvg("frame", element);
    expect(seen).toEqual([element]);
    expect(shape).toBeInstanceOf(GroupShape);
    expect((shape as GroupShape).directChildren()).toEqual([child]);
  });

  it("rejects missing readers and invalid provider results", () => {
    const noReader = new ShapeProviderRegistry([
      { type: "frame", create: (id) => new GroupShape(id) }
    ]);
    expect(noReader.hasSvgReader("frame")).toBe(false);
    expect(() => noReader.readSvg("frame", input())).toThrow(
      "shape provider frame does not support SVG read"
    );
    expect(() => noReader.readSvg("missing", input())).toThrow(
      "unknown shape type: missing (is the plugin loaded?)"
    );

    const wrongId = new ShapeProviderRegistry([
      {
        type: "frame",
        create: (id) => new GroupShape(id),
        readSvg: () => new GroupShape("wrong")
      }
    ]);
    expect(() => wrongId.readSvg("frame", input())).toThrow(
      "shape provider frame returned id wrong instead of frame"
    );

    const wrongObject = new ShapeProviderRegistry([
      {
        type: "frame",
        create: (id) => new GroupShape(id),
        readSvg: () => null as unknown as GroupShape
      }
    ]);
    expect(() => wrongObject.readSvg("frame", input())).toThrow(
      "shape provider frame did not return a shape"
    );
  });
});
