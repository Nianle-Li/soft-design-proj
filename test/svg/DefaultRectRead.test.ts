import { describe, expect, it } from "vitest";
import { SvgCodec } from "../../src/adapters/svg/SvgCodec";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";

const wrap = (content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30" viewBox="0 0 40 30">${content}</svg>`;

describe("default rect SVG readback", () => {
  it("restores geometry, explicit styles and generated ids through the provider", () => {
    const registry = createDefaultShapeProviders();
    expect(registry.hasSvgReader("rect")).toBe(true);
    const xml = wrap(
      '<g id="outer"><rect x="-2" y="3" width="0" height="4" fill="red" stroke="blue" stroke-width="1.50"/></g><rect id="plain" x="1" y="2" width="3" height="4"/>'
    );
    const before = new SvgCodec().decode(xml);
    const after = new SvgCodec(registry).decode(xml);

    expect(after.count).toBe(before.count);
    expect(after.assignedIds).toEqual(before.assignedIds);
    expect(after.document.tree()).toEqual(before.document.tree());
    expect(after.document.explicitStyle("rect1")).toEqual({
      fill: "red",
      stroke: "blue",
      strokeWidth: "1.5"
    });
    expect(after.document.explicitStyle("plain")).toEqual({});
    expect(after.document.show("rect1").parentLabel).toBe("g#outer");
    expect(new SvgCodec(registry).encode(after.document)).toEqual(
      new SvgCodec().encode(before.document)
    );
  });

  it.each([
    ['<rect id="r" y="0" width="1" height="1"/>', "missing SVG attribute: x on <rect>"],
    ['<rect id="r" x=" " y="0" width="1" height="1"/>', "invalid number:  "],
    ['<rect id="r" x="0" y="0" width="-1" height="1"/>', "invalid width: -1"],
    [
      '<rect id="r" x="0" y="0" width="1" height="1" opacity="0.5"/>',
      "unsupported SVG attribute: opacity on <rect>"
    ],
    [
      '<rect id="r" x="0" y="0" width="1" height="1">unexpected</rect>',
      "unsupported text content in <rect>"
    ],
    [
      '<rect id="r" x="0" y="0" width="1" height="1" fill=""/>',
      "invalid fill: value must not be empty"
    ],
    [
      '<rect id="r" x="0" y="0" width="1" height="1"><circle id="c" cx="0" cy="0" r="1"/></rect>',
      "no such container: r"
    ],
    [
      '<circle id="c" cx="0" cy="0" r="1"><rect id="r" x="0" y="0" width="1" height="1"/></circle>',
      "no such container: c"
    ]
  ])("preserves Phase 1 rect read errors", (content, error) => {
    const xml = wrap(content);
    expect(() => new SvgCodec().decode(xml)).toThrow(error);
    expect(() => new SvgCodec(createDefaultShapeProviders()).decode(xml)).toThrow(error);
  });
});
