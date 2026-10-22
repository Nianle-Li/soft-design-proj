import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";

describe("SvgDocument move", () => {
  it("translates all built-in leaves in a nested group without changing size or order", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "outer", []);
    document.create("g", "inner", [], "outer");
    document.create("rect", "rect", ["1", "2", "3", "4"], "inner");
    document.create("circle", "circle", ["5", "6", "7"], "inner");
    document.create("ellipse", "ellipse", ["8", "9", "10", "11"], "inner");
    document.create("line", "line", ["1", "2", "3", "4"], "inner");
    document.create("text", "text", ["5", "6", "hello"], "inner");
    const before = document.tree();

    const movement = document.move("outer", 2.5, -3);
    const after = document.tree();
    const children = document.tree("inner").roots[0]?.children;
    expect(children?.map((child) => child.label)).toEqual([
      "rect#rect",
      "circle#circle",
      "ellipse#ellipse",
      "line#line",
      "text#text"
    ]);
    expect(children?.map((child) => child.details)).toEqual([
      "x=3.5 y=-1 w=3 h=4",
      "cx=7.5 cy=3 r=7",
      "cx=10.5 cy=6 rx=10 ry=11",
      "(3.5,-1) -> (5.5,1)",
      '(7.5,3) "hello"'
    ]);

    document.undoMove(movement);
    expect(document.tree()).toEqual(before);
    document.redoMove(movement);
    expect(document.tree()).toEqual(after);
  });

  it("rejects a non-finite result before changing any child", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "group", []);
    document.create("rect", "first", ["1", "2", "3", "4"], "group");
    document.create("rect", "last", ["1e308", "2", "3", "4"], "group");
    const before = document.tree();

    expect(() => document.move("group", 1e308, 0)).toThrow(
      "move would produce non-finite coordinates"
    );
    expect(document.tree()).toEqual(before);
  });

  it("rejects missing targets and invalid deltas without changing the tree", () => {
    const document = new SvgDocument(800, 600);
    document.create("circle", "c1", ["10", "10", "5"]);
    const before = document.tree();

    expect(() => document.move("missing", 1, 2)).toThrow("no such shape: missing");
    expect(() => document.move("c1", Number.NaN, 2)).toThrow("invalid move delta");
    expect(document.tree()).toEqual(before);
  });
});
