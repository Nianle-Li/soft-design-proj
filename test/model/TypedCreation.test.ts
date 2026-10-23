import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";

describe("typed document creation", () => {
  it("accepts geometry values independently of CLI token order", () => {
    const document = new SvgDocument(100, 100);
    document.create({ kind: "rect", id: "r", x: 1, y: 2, width: 3, height: 4 });

    expect(document.show("r").geometry).toEqual([
      ["x", "1"],
      ["y", "2"],
      ["width", "3"],
      ["height", "4"]
    ]);
  });

  it("rejects invalid typed geometry without mutating the tree", () => {
    const document = new SvgDocument(100, 100);
    const before = document.tree();

    expect(() => document.create({ kind: "circle", id: "bad", cx: 1, cy: 2, r: -1 })).toThrow(
      "invalid r: -1"
    );
    expect(document.tree()).toEqual(before);
  });
});
