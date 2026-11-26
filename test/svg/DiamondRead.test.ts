import { describe, expect, it } from "vitest";
import { DiamondShapeProvider } from "../../plugins/diamond/DiamondShapeProvider";
import { SvgCodec } from "../../src/adapters/svg/SvgCodec";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";

const wrap = (content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">${content}</svg>`;

const validDiamond =
  '<g id="decision" data-kind="diamond"><line id="decision-edge-1" x1="50" y1="10" x2="90" y2="40"/><line id="decision-edge-2" x1="90" y1="40" x2="50" y2="70"/><line id="decision-edge-3" x1="50" y1="70" x2="10" y2="40"/><line id="decision-edge-4" x1="10" y1="40" x2="50" y2="10"/></g>';

describe("diamond SVG readback", () => {
  it("restores a marked group when the diamond provider is installed", () => {
    const codec = new SvgCodec(createDefaultShapeProviders([new DiamondShapeProvider()]));
    const result = codec.decode(wrap(validDiamond));

    expect(result.count).toBe(5);
    expect(result.document.tree("decision").roots[0]).toMatchObject({
      kind: "diamond",
      label: "diamond#decision",
      children: [
        { label: "line#decision-edge-1" },
        { label: "line#decision-edge-2" },
        { label: "line#decision-edge-3" },
        { label: "line#decision-edge-4" }
      ]
    });
    expect(codec.encode(result.document).xml).toContain('<g id="decision" data-kind="diamond">');
  });

  it("degrades to an ordinary group when the provider is absent", () => {
    const codec = new SvgCodec(createDefaultShapeProviders());
    const result = codec.decode(wrap(validDiamond));

    expect(result.document.tree("decision").roots[0]).toMatchObject({
      kind: "g",
      label: "g#decision",
      children: [
        { label: "line#decision-edge-1" },
        { label: "line#decision-edge-2" },
        { label: "line#decision-edge-3" },
        { label: "line#decision-edge-4" }
      ]
    });
    expect(codec.encode(result.document).xml).not.toContain("data-kind");
  });

  it.each([
    validDiamond.replace('id="decision-edge-1"', 'id="wrong"'),
    validDiamond.replace(/<line id="decision-edge-4"[^>]+\/>/u, ""),
    validDiamond.replace('data-kind="diamond"', 'data-kind="diamond" opacity="0.5"'),
    validDiamond.replace("</g>", "unexpected</g>")
  ])("rejects malformed marked structure: %s", (content) => {
    const codec = new SvgCodec(createDefaultShapeProviders([new DiamondShapeProvider()]));
    expect(() => codec.decode(wrap(content))).toThrow("invalid diamond structure: decision");
  });
});
