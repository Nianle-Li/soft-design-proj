import { describe, expect, it } from "vitest";
import { SvgCodec } from "../../src/adapters/svg/SvgCodec";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";
import { BoxShapeProvider } from "../../plugins/box/BoxShapeProvider";

const wrap = (content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">${content}</svg>`;

const validBox =
  '<g id="n1" data-kind="box"><rect id="n1-rect" x="10" y="20" width="100" height="40" fill="#4a90d9"/><text id="n1-label" x="30" y="45">Title</text></g>';

describe("box SVG readback", () => {
  it("restores a marked group as a box when its semantic provider is installed", () => {
    const codec = new SvgCodec(createDefaultShapeProviders([new BoxShapeProvider()]));
    const result = codec.decode(wrap(validBox));

    expect(result.count).toBe(3);
    expect(result.document.tree("n1").roots[0]).toMatchObject({
      kind: "box",
      label: "g#n1",
      children: [{ label: "rect#n1-rect" }, { label: "text#n1-label" }]
    });
    expect(codec.encode(result.document).xml).toContain('<g id="n1" data-kind="box">');
  });

  it("degrades to an ordinary group when the semantic provider is absent", () => {
    const codec = new SvgCodec(createDefaultShapeProviders());
    const result = codec.decode(wrap(validBox));

    expect(result.document.tree("n1").roots[0]).toMatchObject({
      kind: "g",
      label: "g#n1",
      children: [{ label: "rect#n1-rect" }, { label: "text#n1-label" }]
    });
    expect(codec.encode(result.document).xml).not.toContain("data-kind");
  });

  it("requires an installed semantic provider to implement SVG readback", () => {
    const providers = createDefaultShapeProviders([
      {
        type: "box",
        create: (id, parameters, context) => new BoxShapeProvider().create(id, parameters, context)
      }
    ]);
    expect(() => new SvgCodec(providers).decode(wrap(validBox))).toThrow(
      "shape provider box does not support SVG read"
    );
  });

  it.each([
    '<g id="n1" data-kind="box"><text id="n1-label" x="30" y="45">Title</text></g>',
    '<g id="n1" data-kind="box"><text id="n1-label" x="30" y="45">Title</text><rect id="n1-rect" x="10" y="20" width="100" height="40"/></g>',
    '<g id="n1" data-kind="box"><rect id="other" x="10" y="20" width="100" height="40"/><text id="n1-label" x="30" y="45">Title</text></g>',
    '<g id="n1" data-kind="box"><rect id="n1-rect" x="10" y="20" width="100" height="40"/><text id="other" x="30" y="45">Title</text></g>'
  ])("rejects malformed marked structure: %s", (content) => {
    const codec = new SvgCodec(createDefaultShapeProviders([new BoxShapeProvider()]));
    expect(() => codec.decode(wrap(content))).toThrow("invalid box structure: n1");
  });

  it("allows additional content after the two protected parts", () => {
    const codec = new SvgCodec(createDefaultShapeProviders([new BoxShapeProvider()]));
    const content = validBox.replace("</g>", '<circle id="nested" cx="150" cy="50" r="10"/></g>');
    const result = codec.decode(wrap(content));

    expect(result.document.tree("n1").roots[0]?.children.map((child) => child.label)).toEqual([
      "rect#n1-rect",
      "text#n1-label",
      "circle#nested"
    ]);
  });

  it("rejects duplicate ids before replacing any document", () => {
    const codec = new SvgCodec(createDefaultShapeProviders([new BoxShapeProvider()]));
    const duplicate = validBox.replace('id="n1-label"', 'id="n1-rect"');
    expect(() => codec.decode(wrap(duplicate))).toThrow("id already exists: n1-rect");
  });
});
