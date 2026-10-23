import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";
import { createFromCommand } from "../support/createFromCommand";

describe("SvgDocument ungrouping", () => {
  it("promotes direct children into the former position and restores nesting on undo", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "g", "outer", []);
    createFromCommand(document, "rect", "before", ["0", "0", "1", "1"], "outer");
    createFromCommand(document, "g", "nested", [], "outer");
    createFromCommand(document, "rect", "first", ["1", "0", "1", "1"], "nested");
    createFromCommand(document, "g", "branch", [], "nested");
    createFromCommand(document, "circle", "grandchild", ["2", "0", "1"], "branch");
    createFromCommand(document, "rect", "last", ["3", "0", "1", "1"], "nested");
    createFromCommand(document, "rect", "after", ["4", "0", "1", "1"], "outer");
    document.set("nested", "fill", "red");
    const before = document.tree();

    const receipt = document.ungroup("nested");
    expect(document.tree("outer").roots[0]?.children.map((shape) => shape.label)).toEqual([
      "rect#before",
      "rect#first",
      "g#branch",
      "rect#last",
      "rect#after"
    ]);
    expect(document.tree("grandchild").roots[0]?.label).toBe("circle#grandchild");
    expect(() => document.tree("nested")).toThrow("no such shape: nested");

    document.undoUngroup(receipt);
    expect(document.tree()).toEqual(before);
    expect(document.explicitStyle("nested").fill).toBe("red");
    document.redoUngroup(receipt);
    expect(document.tree("outer").roots[0]?.children.map((shape) => shape.label)).toEqual([
      "rect#before",
      "rect#first",
      "g#branch",
      "rect#last",
      "rect#after"
    ]);
  });

  it("allows an empty nested group to be removed and restored", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "g", "outer", []);
    createFromCommand(document, "g", "empty", [], "outer");
    const before = document.tree();

    const receipt = document.ungroup("empty");
    expect(document.tree("outer").roots[0]?.children).toEqual([]);
    document.undoUngroup(receipt);
    expect(document.tree()).toEqual(before);
  });

  it("rejects root-level groups, leaves and missing targets without changing the tree", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "g", "outer", []);
    createFromCommand(document, "rect", "leaf", ["0", "0", "1", "1"], "outer");
    const before = document.tree();

    expect(() => document.ungroup("outer")).toThrow("cannot ungroup top-level container: outer");
    expect(() => document.ungroup("leaf")).toThrow("not a container: leaf");
    expect(() => document.ungroup("missing")).toThrow("no such shape: missing");
    expect(document.tree()).toEqual(before);
  });
});
