import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";
import { ShapeFactory } from "../../src/model/ShapeFactory";

describe("legacy typed construction before document attachment", () => {
  it("accepts geometry values independently of CLI token order", () => {
    const document = new SvgDocument(100, 100);
    const shape = new ShapeFactory().create({
      kind: "rect",
      id: "r",
      x: 1,
      y: 2,
      width: 3,
      height: 4
    });
    document.createCandidate(shape);

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

    expect(() =>
      new ShapeFactory().create({ kind: "circle", id: "bad", cx: 1, cy: 2, r: -1 })
    ).toThrow("invalid r: -1");
    expect(document.tree()).toEqual(before);
  });
});
