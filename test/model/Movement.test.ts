import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";
import { createFromCommand } from "../support/createFromCommand";

describe("SvgDocument move", () => {
  it("translates all built-in leaves in a nested group without changing size or order", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "g", "outer", []);
    createFromCommand(document, "g", "inner", [], "outer");
    createFromCommand(document, "rect", "rect", ["1", "2", "3", "4"], "inner");
    createFromCommand(document, "circle", "circle", ["5", "6", "7"], "inner");
    createFromCommand(document, "ellipse", "ellipse", ["8", "9", "10", "11"], "inner");
    createFromCommand(document, "line", "line", ["1", "2", "3", "4"], "inner");
    createFromCommand(document, "text", "text", ["5", "6", "hello"], "inner");
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
    expect(document.show("rect").geometry).toEqual([
      ["x", "3.5"],
      ["y", "-1"],
      ["width", "3"],
      ["height", "4"]
    ]);
    expect(document.show("circle").geometry).toEqual([
      ["cx", "7.5"],
      ["cy", "3"],
      ["r", "7"]
    ]);
    expect(document.show("ellipse").geometry).toEqual([
      ["cx", "10.5"],
      ["cy", "6"],
      ["rx", "10"],
      ["ry", "11"]
    ]);
    expect(document.show("line").geometry).toEqual([
      ["x1", "3.5"],
      ["y1", "-1"],
      ["x2", "5.5"],
      ["y2", "1"]
    ]);
    expect(document.show("text")).toMatchObject({
      geometry: [
        ["x", "7.5"],
        ["y", "3"]
      ],
      text: "hello"
    });

    document.undoMove(movement);
    expect(document.tree()).toEqual(before);
    document.redoMove(movement);
    expect(document.tree()).toEqual(after);
  });

  it("rejects a non-finite result before changing any child", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "g", "group", []);
    createFromCommand(document, "rect", "first", ["1", "2", "3", "4"], "group");
    createFromCommand(document, "rect", "last", ["1e308", "2", "3", "4"], "group");
    const before = document.tree();

    expect(() => document.move("group", 1e308, 0)).toThrow(
      "move would produce non-finite coordinates"
    );
    expect(document.tree()).toEqual(before);
  });

  it("rejects missing targets and invalid deltas without changing the tree", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "circle", "c1", ["10", "10", "5"]);
    const before = document.tree();

    expect(() => document.move("missing", 1, 2)).toThrow("no such shape: missing");
    expect(() => document.move("c1", Number.NaN, 2)).toThrow("invalid move delta");
    expect(document.tree()).toEqual(before);
  });
});
