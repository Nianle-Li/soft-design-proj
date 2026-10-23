import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";
import { createFromCommand } from "../support/createFromCommand";

describe("SvgDocument scale", () => {
  it("scales every geometric attribute in a nested container and restores it exactly", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "g", "outer", []);
    createFromCommand(document, "g", "inner", [], "outer");
    createFromCommand(document, "rect", "rect", ["1", "2", "3", "4", "red"], "inner");
    createFromCommand(document, "circle", "circle", ["5", "6", "7", "blue"], "inner");
    createFromCommand(document, "ellipse", "ellipse", ["8", "9", "10", "11"], "inner");
    createFromCommand(document, "line", "line", ["1", "2", "3", "4", "black"], "inner");
    createFromCommand(document, "text", "text", ["5", "6", "hello"], "inner");
    const before = document.tree();

    const scaling = document.scale("outer", 2);
    const after = document.tree();
    expect(document.show("rect")).toMatchObject({
      geometry: [
        ["x", "2"],
        ["y", "4"],
        ["width", "6"],
        ["height", "8"]
      ],
      style: { fill: "red" }
    });
    expect(document.show("circle")).toMatchObject({
      geometry: [
        ["cx", "10"],
        ["cy", "12"],
        ["r", "14"]
      ],
      style: { fill: "blue" }
    });
    expect(document.show("ellipse").geometry).toEqual([
      ["cx", "16"],
      ["cy", "18"],
      ["rx", "20"],
      ["ry", "22"]
    ]);
    expect(document.show("line").geometry).toEqual([
      ["x1", "2"],
      ["y1", "4"],
      ["x2", "6"],
      ["y2", "8"]
    ]);
    expect(document.show("text")).toMatchObject({
      geometry: [
        ["x", "10"],
        ["y", "12"]
      ],
      text: "hello"
    });

    document.undoScale(scaling);
    expect(document.tree()).toEqual(before);
    document.redoScale(scaling);
    expect(document.tree()).toEqual(after);
  });

  it("rejects an overflowing descendant before scaling any sibling", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "g", "group", []);
    createFromCommand(document, "rect", "first", ["1", "2", "3", "4"], "group");
    createFromCommand(document, "rect", "last", ["1e308", "2", "3", "4"], "group");
    const before = document.tree();

    expect(() => document.scale("group", 2)).toThrow("scale would produce non-finite geometry");
    expect(document.tree()).toEqual(before);
  });

  it("rejects missing targets and non-positive factors without changing geometry", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "circle", "c1", ["10", "10", "5"]);
    const before = document.tree();

    expect(() => document.scale("missing", 2)).toThrow("no such shape: missing");
    expect(() => document.scale("c1", 0)).toThrow("scale factor must be positive");
    expect(() => document.scale("c1", -1)).toThrow("scale factor must be positive");
    expect(() => document.scale("c1", Number.NaN)).toThrow("scale factor must be positive");
    expect(document.tree()).toEqual(before);
  });
});
