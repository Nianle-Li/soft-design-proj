import { describe, expect, it } from "vitest";
import { SvgCodec } from "../../src/adapters/svg/SvgCodec";
import { RectShape } from "../../src/builtin/shapes/RectShape";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";

const wrap = (content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30" viewBox="0 0 40 30">${content}</svg>`;

describe("default text SVG readback", () => {
  it("preserves decoded text, whitespace, styles and generated ids", () => {
    const registry = createDefaultShapeProviders();
    expect(registry.hasSvgReader("text")).toBe(true);
    const xml = wrap(
      '<g id="outer"><text x="-2" y="3" fill="#fff" stroke-width="1.50"> 处理 &lt;&amp;&gt; \n </text><text id="empty" x="0" y="0"></text></g>'
    );
    const before = new SvgCodec().decode(xml);
    const after = new SvgCodec(registry).decode(xml);

    expect(after.count).toBe(before.count);
    expect(after.assignedIds).toEqual([{ id: "text1", tag: "text" }]);
    expect(after.document.tree()).toEqual(before.document.tree());
    expect(after.document.show("text1").text).toBe(" 处理 <&> \n ");
    expect(after.document.show("empty").text).toBe("");
    expect(after.document.explicitStyle("text1")).toEqual({ fill: "#fff", strokeWidth: "1.5" });
    expect(new SvgCodec(registry).encode(after.document)).toEqual(
      new SvgCodec().encode(before.document)
    );
  });

  it.each([
    ['<text id="t" y="0">x</text>', "missing SVG attribute: x on <text>"],
    ['<text id="t" x="0" y="NaN">x</text>', "invalid number: NaN"],
    [
      '<text id="t" x="0" y="0" opacity="0.5">x</text>',
      "unsupported SVG attribute: opacity on <text>"
    ],
    ['<text id="t" x="0" y="0" stroke-width="-1">x</text>', "invalid stroke-width: -1"],
    ['<text id="t" x="0" y="0">a<tspan>b</tspan></text>', "unsupported child element in <text>"],
    [
      '<text id="t" x="0" y="0"><rect id="r" x="0" y="0" width="1" height="1"/></text>',
      "unsupported child element in <text>"
    ]
  ])("preserves Phase 1 text errors", (content, error) => {
    const xml = wrap(content);
    expect(() => new SvgCodec().decode(xml)).toThrow(error);
    expect(() => new SvgCodec(createDefaultShapeProviders()).decode(xml)).toThrow(error);
  });

  it("rejects child shapes when a reader is invoked directly", () => {
    const registry = createDefaultShapeProviders();
    expect(() =>
      registry.readSvg("text", {
        tag: "text",
        id: "t",
        attributes: new Map([
          ["id", "t"],
          ["x", "0"],
          ["y", "0"]
        ]),
        text: "",
        children: [new RectShape("r", 0, 0, 1, 1)]
      })
    ).toThrow("unsupported child element in <text>");
  });
});
