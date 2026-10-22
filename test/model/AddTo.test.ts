import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";

describe("SvgDocument addTo", () => {
  it("moves a subtree across parents to the destination tail and restores its old position", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "source", []);
    document.create("rect", "before", ["0", "0", "1", "1"], "source");
    document.create("g", "branch", [], "source");
    document.create("circle", "child", ["2", "2", "1"], "branch");
    document.create("rect", "after", ["3", "0", "1", "1"], "source");
    document.create("g", "target", []);
    document.create("rect", "existing", ["4", "0", "1", "1"], "target");
    const before = document.tree();

    const receipt = document.addTo("target", "branch");
    expect(document.tree("source").roots[0]?.children.map((shape) => shape.label)).toEqual([
      "rect#before",
      "rect#after"
    ]);
    expect(document.tree("target").roots[0]?.children.map((shape) => shape.label)).toEqual([
      "rect#existing",
      "g#branch"
    ]);
    expect(document.tree("child").roots[0]?.label).toBe("circle#child");

    document.undoAddTo(receipt);
    expect(document.tree()).toEqual(before);
    document.redoAddTo(receipt);
    expect(document.tree("target").roots[0]?.children.at(-1)?.label).toBe("g#branch");
  });

  it("moves a same-parent child to the tail without duplicating it", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "target", []);
    for (const id of ["a", "b", "c"]) {
      document.create("rect", id, ["0", "0", "1", "1"], "target");
    }
    const before = document.tree();

    const receipt = document.addTo("target", "a");
    expect(document.tree("target").roots[0]?.children.map((shape) => shape.label)).toEqual([
      "rect#b",
      "rect#c",
      "rect#a"
    ]);
    document.undoAddTo(receipt);
    expect(document.tree()).toEqual(before);
  });

  it("rejects self-placement, descendant placement and invalid targets atomically", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "outer", []);
    document.create("g", "inner", [], "outer");
    document.create("rect", "leaf", ["0", "0", "1", "1"], "inner");
    const before = document.tree();

    expect(() => document.addTo("outer", "outer")).toThrow(
      "cannot add a container into itself or its descendant: outer"
    );
    expect(() => document.addTo("inner", "outer")).toThrow(
      "cannot add a container into itself or its descendant: outer"
    );
    expect(() => document.addTo("missing", "leaf")).toThrow("no such container: missing");
    expect(() => document.addTo("leaf", "inner")).toThrow("not a container: leaf");
    expect(() => document.addTo("outer", "missing")).toThrow("no such shape: missing");
    expect(document.tree()).toEqual(before);
  });
});
