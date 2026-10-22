import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";

describe("SvgDocument scale", () => {
  it("scales every geometric attribute in a nested container and restores it exactly", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "outer", []);
    document.create("g", "inner", [], "outer");
    document.create("rect", "rect", ["1", "2", "3", "4", "red"], "inner");
    document.create("circle", "circle", ["5", "6", "7", "blue"], "inner");
    document.create("ellipse", "ellipse", ["8", "9", "10", "11"], "inner");
    document.create("line", "line", ["1", "2", "3", "4", "black"], "inner");
    document.create("text", "text", ["5", "6", "hello"], "inner");
    const before = document.tree();

    const scaling = document.scale("outer", 2);
    const after = document.tree();
    expect(document.tree("inner").roots[0]?.children.map((child) => child.details)).toEqual([
      "x=2 y=4 w=6 h=8 fill=red",
      "cx=10 cy=12 r=14 fill=blue",
      "cx=16 cy=18 rx=20 ry=22",
      "(2,4) -> (6,8)",
      '(10,12) "hello"'
    ]);

    document.undoScale(scaling);
    expect(document.tree()).toEqual(before);
    document.redoScale(scaling);
    expect(document.tree()).toEqual(after);
  });

  it("rejects an overflowing descendant before scaling any sibling", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "group", []);
    document.create("rect", "first", ["1", "2", "3", "4"], "group");
    document.create("rect", "last", ["1e308", "2", "3", "4"], "group");
    const before = document.tree();

    expect(() => document.scale("group", 2)).toThrow("scale would produce non-finite geometry");
    expect(document.tree()).toEqual(before);
  });

  it("rejects missing targets and non-positive factors without changing geometry", () => {
    const document = new SvgDocument(800, 600);
    document.create("circle", "c1", ["10", "10", "5"]);
    const before = document.tree();

    expect(() => document.scale("missing", 2)).toThrow("no such shape: missing");
    expect(() => document.scale("c1", 0)).toThrow("scale factor must be positive");
    expect(() => document.scale("c1", -1)).toThrow("scale factor must be positive");
    expect(() => document.scale("c1", Number.NaN)).toThrow("scale factor must be positive");
    expect(document.tree()).toEqual(before);
  });
});
