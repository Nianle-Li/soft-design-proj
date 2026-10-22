import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";
import { SvgCodec } from "../../src/svg/SvgCodec";

const SVG_NS = "http://www.w3.org/2000/svg";
const wrap = (content: string, rootAttributes = "") =>
  `<svg xmlns="${SVG_NS}" width="40" height="30" viewBox="0 0 40 30" ${rootAttributes}>${content}</svg>`;

describe("strict SVG codec", () => {
  const codec = new SvgCodec();

  it("loads the assignment's other.svg with one warning and seven ordered elements", () => {
    const xml = readFileSync(resolve("test/fixtures/svg/other.svg"), "utf8");
    const result = codec.decode(xml);
    expect(result.count).toBe(7);
    expect(result.assignedIds).toEqual([{ id: "rect1", tag: "rect" }]);
    expect(result.document.tree().roots.map((node) => node.label)).toEqual([
      "rect#rect1",
      "text#t1",
      "circle#c1",
      "g#g1",
      "ellipse#e1"
    ]);
    expect(result.document.tree("g1").roots[0]?.children.map((node) => node.label)).toEqual([
      "rect#r2",
      "circle#c2"
    ]);
  });

  it("round-trips hierarchy, z-order, explicit styles and escaped Unicode text", () => {
    const document = new SvgDocument(80, 60);
    document.create("g", "group", []);
    document.create("text", "label", ["10", "20", `处理 <&> "引号"`], "group");
    document.set("label", "stroke", "red");
    document.set("group", "fill", "#fff");
    document.create("rect", "plain", ["0", "0", "1", "1"]);
    document.reorder("group", "front");

    const saved = codec.encode(document);
    expect(saved.count).toBe(3);
    expect(saved.xml).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(saved.xml).toContain('viewBox="0 0 80 60"');
    expect(saved.xml).toContain('处理 &lt;&amp;&gt; "引号"');
    expect(saved.xml).not.toContain('fill="black"');
    const restored = codec.decode(saved.xml).document;
    expect(restored.tree()).toEqual(document.tree());
    expect(restored.explicitStyle("label")).toEqual({ stroke: "red" });
    expect(restored.explicitStyle("group")).toEqual({ fill: "#fff" });
    expect(codec.decode(codec.encode(restored).xml).document.tree()).toEqual(document.tree());
  });

  it("round-trips every Phase 1 shape without filling in omitted paint defaults", () => {
    const document = new SvgDocument(300, 200);
    document.create("g", "group", []);
    document.create("rect", "r", ["1", "2", "3", "4"], "group");
    document.create("circle", "c", ["5", "6", "7"], "group");
    document.create("ellipse", "e", ["8", "9", "10", "11"], "group");
    document.create("line", "l", ["1", "2", "3", "4"], "group");
    document.create("text", "t", ["12", "13", "hello"], "group");
    document.set("r", "stroke-width", "1.5");

    const saved = codec.encode(document);
    expect(saved.count).toBe(6);
    expect(saved.xml).not.toContain('fill="black"');
    expect(saved.xml).not.toContain('stroke="none"');
    const restored = codec.decode(saved.xml).document;
    expect(restored.tree()).toEqual(document.tree());
    expect(restored.explicitStyle("r")).toEqual({ strokeWidth: "1.5" });
    expect(restored.explicitStyle("c")).toEqual({});
  });

  it.each([
    ["unknown shape", wrap('<path id="x" d="M0 0"/>')],
    ["unknown attribute", wrap('<rect id="x" x="0" y="0" width="1" height="1" opacity="0.5"/>')],
    ["transform", wrap('<g id="x" transform="scale(2)"/>')],
    ["unknown root attribute", wrap("", 'style="color:red"')],
    ["mixed text", wrap('<text id="x" x="1" y="2">a<tspan>b</tspan></text>')],
    ["CDATA", wrap('<text id="x" x="1" y="2"><![CDATA[hello]]></text>')],
    ["comment", wrap('<!-- unsupported --><rect id="x" x="0" y="0" width="1" height="1"/>')],
    ["DTD", `<!DOCTYPE svg [<!ENTITY x "x">]>${wrap("")}`],
    ["bad XML", wrap('<rect id="x">')],
    ["wrong viewBox", `<svg xmlns="${SVG_NS}" width="40" height="30" viewBox="0 0 1 1"/>`]
  ])("rejects %s without silently dropping data", (_name, xml) => {
    expect(() => codec.decode(xml)).toThrow();
  });

  it("avoids explicit ids when assigning missing ids and rejects duplicates", () => {
    const result = codec.decode(
      wrap(
        '<rect x="0" y="0" width="1" height="1"/><rect id="rect1" x="1" y="0" width="1" height="1"/>'
      )
    );
    expect(result.assignedIds).toEqual([{ id: "rect2", tag: "rect" }]);
    expect(result.document.tree().roots.map((node) => node.label)).toEqual([
      "rect#rect2",
      "rect#rect1"
    ]);
    expect(() =>
      codec.decode(wrap('<g id="same"/><rect id="same" x="0" y="0" width="1" height="1"/>'))
    ).toThrow("id already exists: same");
  });
});
