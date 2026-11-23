import { describe, expect, it } from "vitest";
import { parseSvgOutline } from "../src/SvgOutline";

describe("SVG Outline source projection", () => {
  it("retains root, nested containers and leaves with exact source offsets", () => {
    const source =
      '<svg id="root">\n  <g id="flow">\n    <rect id="start"/>\n    <text>Hi</text>\n  </g>\n</svg>';
    const nodes = parseSvgOutline(source);
    expect(nodes.map((node) => node.name)).toEqual(["svg#root"]);
    expect(nodes[0]?.children[0]?.name).toBe("g#flow");
    expect(nodes[0]?.children[0]?.children.map((node) => node.name)).toEqual([
      "rect#start",
      "text"
    ]);
    const rect = nodes[0]?.children[0]?.children[0];
    if (!rect) throw new Error("expected nested rectangle");
    expect(rect.start).toBe(source.indexOf("<rect"));
    expect(rect.end).toBe(source.indexOf("/>", source.indexOf("<rect")) + 2);
    expect(source.slice(rect.start, rect.selectionEnd)).toBe("<rect");
  });

  it("uses the current text on every request", () => {
    expect(parseSvgOutline('<svg><g id="old"/></svg>')[0]?.children[0]?.name).toBe("g#old");
    expect(parseSvgOutline('<svg><g id="new"/></svg>')[0]?.children[0]?.name).toBe("g#new");
  });

  it.each(["<svg><g>", "<svg><g></svg>", '<svg><rect id="x></svg>'])(
    "returns no symbols for incomplete XML: %s",
    (source) => {
      expect(parseSvgOutline(source)).toEqual([]);
    }
  );
});
