import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";
import { createFromCommand } from "../support/createFromCommand";

describe("SvgDocument z-order", () => {
  it("moves a root shape to the visual front, then restores its original index", () => {
    const document = new SvgDocument(800, 600);
    for (const id of ["a", "b", "c"]) {
      createFromCommand(document, "rect", id, ["0", "0", "1", "1"]);
    }
    const before = document.tree();

    const receipt = document.reorder("a", "front");
    expect(document.tree().roots.map((shape) => shape.label)).toEqual([
      "rect#b",
      "rect#c",
      "rect#a"
    ]);
    document.undoReorder(receipt);
    expect(document.tree()).toEqual(before);
    document.redoReorder(receipt);
    expect(document.tree().roots.at(-1)?.label).toBe("rect#a");
  });

  it("moves only among siblings and keeps a selected container's subtree intact", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "g", "outer", []);
    createFromCommand(document, "rect", "a", ["0", "0", "1", "1"], "outer");
    createFromCommand(document, "g", "branch", [], "outer");
    createFromCommand(document, "circle", "child", ["1", "1", "1"], "branch");
    createFromCommand(document, "rect", "c", ["2", "0", "1", "1"], "outer");
    createFromCommand(document, "rect", "root", ["3", "0", "1", "1"]);
    const before = document.tree();

    const receipt = document.reorder("branch", "back");
    expect(document.tree().roots.map((shape) => shape.label)).toEqual(["g#outer", "rect#root"]);
    expect(document.tree("outer").roots[0]?.children.map((shape) => shape.label)).toEqual([
      "g#branch",
      "rect#a",
      "rect#c"
    ]);
    expect(document.tree("child").roots[0]?.label).toBe("circle#child");
    document.undoReorder(receipt);
    expect(document.tree()).toEqual(before);
  });

  it("handles already extreme siblings and an unknown id without changing tree membership", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "rect", "a", ["0", "0", "1", "1"]);
    createFromCommand(document, "rect", "b", ["1", "0", "1", "1"]);
    const before = document.tree();

    expect(() => document.reorder("missing", "front")).toThrow("no such shape: missing");
    const front = document.reorder("b", "front");
    const back = document.reorder("a", "back");
    expect(document.tree()).toEqual(before);
    document.undoReorder(back);
    document.undoReorder(front);
    expect(document.tree()).toEqual(before);
  });
});
