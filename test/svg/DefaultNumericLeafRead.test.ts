import { describe, expect, it } from "vitest";
import { SvgCodec } from "../../src/adapters/svg/SvgCodec";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";

const wrap = (content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30" viewBox="0 0 40 30">${content}</svg>`;

describe("numeric leaf SVG readback", () => {
  it.each([
    {
      type: "circle",
      element: '<circle cx="-2" cy="3" r="0" fill="red" stroke-width="1.50"/>',
      style: { fill: "red", strokeWidth: "1.5" }
    },
    {
      type: "ellipse",
      element: '<ellipse cx="4" cy="5" rx="0" ry="7" stroke="blue"/>',
      style: { stroke: "blue" }
    },
    {
      type: "line",
      element: '<line x1="1" y1="2" x2="3" y2="4" fill="#fff" stroke="green" stroke-width="2.0"/>',
      style: { fill: "#fff", stroke: "green", strokeWidth: "2" }
    }
  ])("reads $type through its provider with Phase 1 output", ({ type, element, style }) => {
    const registry = createDefaultShapeProviders();
    expect(registry.hasSvgReader(type)).toBe(true);
    const xml = wrap(`<g id="outer">${element}</g>`);
    const before = new SvgCodec().decode(xml);
    const after = new SvgCodec(registry).decode(xml);
    const id = `${type}1`;

    expect(after.count).toBe(before.count);
    expect(after.assignedIds).toEqual([{ id, tag: type }]);
    expect(after.document.tree()).toEqual(before.document.tree());
    expect(after.document.show(id).parentLabel).toBe("g#outer");
    expect(after.document.explicitStyle(id)).toEqual(style);
    expect(new SvgCodec(registry).encode(after.document)).toEqual(
      new SvgCodec().encode(before.document)
    );
  });

  it.each([
    ["circle missing cx", '<circle id="c" cy="0" r="1"/>', "missing SVG attribute: cx on <circle>"],
    ["circle radius", '<circle id="c" cx="0" cy="0" r="-1"/>', "invalid r: -1"],
    ["ellipse rx", '<ellipse id="e" cx="0" cy="0" rx="-1" ry="2"/>', "invalid rx: -1"],
    ["ellipse ry", '<ellipse id="e" cx="0" cy="0" rx="1" ry="-2"/>', "invalid ry: -2"],
    ["line number", '<line id="l" x1="0" y1="0" x2="NaN" y2="1"/>', "invalid number: NaN"],
    [
      "line stroke",
      '<line id="l" x1="0" y1="0" x2="1" y2="1" stroke=""/>',
      "invalid stroke: value must not be empty"
    ],
    [
      "unknown attribute",
      '<ellipse id="e" cx="0" cy="0" rx="1" ry="2" opacity="0.5"/>',
      "unsupported SVG attribute: opacity on <ellipse>"
    ],
    [
      "unexpected text",
      '<line id="l" x1="0" y1="0" x2="1" y2="1">x</line>',
      "unsupported text content in <line>"
    ],
    [
      "circle child",
      '<circle id="c" cx="0" cy="0" r="1"><rect id="r" x="0" y="0" width="1" height="1"/></circle>',
      "no such container: c"
    ],
    [
      "ellipse child",
      '<ellipse id="e" cx="0" cy="0" rx="1" ry="2"><rect id="r" x="0" y="0" width="1" height="1"/></ellipse>',
      "no such container: e"
    ],
    [
      "line child",
      '<line id="l" x1="0" y1="0" x2="1" y2="1"><rect id="r" x="0" y="0" width="1" height="1"/></line>',
      "no such container: l"
    ]
  ])("preserves Phase 1 $0 error", (_name, content, error) => {
    const xml = wrap(content);
    expect(() => new SvgCodec().decode(xml)).toThrow(error);
    expect(() => new SvgCodec(createDefaultShapeProviders()).decode(xml)).toThrow(error);
  });
});
