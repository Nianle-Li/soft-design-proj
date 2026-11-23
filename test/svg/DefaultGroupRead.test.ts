import { describe, expect, it } from "vitest";
import { SvgCodec } from "../../src/adapters/svg/SvgCodec";
import { GroupShape } from "../../src/builtin/shapes/GroupShape";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";

const wrap = (content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30" viewBox="0 0 40 30">${content}</svg>`;

describe("default g SVG readback", () => {
  it("reads nested groups through the registered provider without changing Phase 1 output", () => {
    const registry = createDefaultShapeProviders();
    expect(registry.hasSvgReader("g")).toBe(true);
    const xml = wrap(
      '<g id="outer" fill="#fff" stroke-width="1.50"><g id="inner" stroke="red"><rect x="1" y="2" width="3" height="4"/></g><text id="title" x="5" y="6">A &amp; B</text></g>'
    );
    const oldResult = new SvgCodec().decode(xml);
    const result = new SvgCodec(registry).decode(xml);

    expect(result.count).toBe(oldResult.count);
    expect(result.assignedIds).toEqual(oldResult.assignedIds);
    expect(result.document.tree()).toEqual(oldResult.document.tree());
    expect(result.document.explicitStyle("outer")).toEqual({ fill: "#fff", strokeWidth: "1.5" });
    expect(result.document.explicitStyle("inner")).toEqual({ stroke: "red" });
    expect(result.document.show("rect1").parentLabel).toBe("g#inner");
    expect(new SvgCodec(registry).encode(result.document)).toEqual(
      new SvgCodec().encode(oldResult.document)
    );
  });

  it.each([
    ['<g id="x" transform="scale(2)"/>', "unsupported SVG attribute: transform on <g>"],
    ['<g id="x">unexpected</g>', "unsupported text content in <g>"],
    ['<g id="x" stroke-width="-1"/>', "invalid stroke-width: -1"],
    ['<g id="x" fill=""/>', "invalid fill: value must not be empty"],
    ['<g id="x"><rect id="r" x="0" y="0" width="-1" height="1"/></g>', "invalid width: -1"]
  ])("preserves Phase 1 g errors", (content, error) => {
    const xml = wrap(content);
    expect(() => new SvgCodec().decode(xml)).toThrow(error);
    expect(() => new SvgCodec(createDefaultShapeProviders()).decode(xml)).toThrow(error);
  });

  it("accepts a registered child reader inside the built-in group", () => {
    const registry = createDefaultShapeProviders([
      {
        type: "frame",
        create: (id) => new GroupShape(id),
        readSvg(element) {
          const group = new GroupShape(element.id);
          for (const child of element.children) group.insertChild(group.childCount, child);
          return group;
        }
      }
    ]);
    const result = new SvgCodec(registry).decode(
      wrap(
        '<g id="outer"><frame id="f1"><rect id="r1" x="0" y="0" width="1" height="1"/></frame></g>'
      )
    );
    expect(result.count).toBe(3);
    expect(result.document.show("f1").parentLabel).toBe("g#outer");
    expect(result.document.show("r1").parentLabel).toBe("g#f1");
  });
});
