import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";

describe("SvgDocument grouping", () => {
  it("groups same-parent targets at the first selected sibling in document order", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "outer", []);
    for (const id of ["a", "gap", "b", "tail"]) {
      document.create("rect", id, ["0", "0", "1", "1"], "outer");
    }
    const before = document.tree();

    const receipt = document.group("bundle", ["b", "a"]);
    expect(document.tree("outer").roots[0]?.children.map((shape) => shape.label)).toEqual([
      "g#bundle",
      "rect#gap",
      "rect#tail"
    ]);
    expect(document.tree("bundle").roots[0]?.children.map((shape) => shape.label)).toEqual([
      "rect#a",
      "rect#b"
    ]);
    document.undoGroup(receipt);
    expect(document.tree()).toEqual(before);
    document.redoGroup(receipt);
    expect(document.tree("bundle").roots[0]?.children.map((shape) => shape.label)).toEqual([
      "rect#a",
      "rect#b"
    ]);
  });

  it("uses the nearest shared parent and earliest branch for cross-parent targets", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "outer", []);
    document.create("g", "left", [], "outer");
    document.create("rect", "first", ["0", "0", "1", "1"], "left");
    document.create("rect", "stay", ["1", "0", "1", "1"], "left");
    document.create("rect", "middle", ["2", "0", "1", "1"], "outer");
    document.create("g", "right", [], "outer");
    document.create("rect", "last", ["3", "0", "1", "1"], "right");
    const before = document.tree();

    const receipt = document.group("bundle", ["last", "first"]);
    expect(document.tree("outer").roots[0]?.children.map((shape) => shape.label)).toEqual([
      "g#bundle",
      "g#left",
      "rect#middle",
      "g#right"
    ]);
    expect(document.tree("bundle").roots[0]?.children.map((shape) => shape.label)).toEqual([
      "rect#first",
      "rect#last"
    ]);
    expect(document.tree("left").roots[0]?.children.map((shape) => shape.label)).toEqual([
      "rect#stay"
    ]);
    document.undoGroup(receipt);
    expect(document.tree()).toEqual(before);
    document.redoGroup(receipt);
    expect(document.tree("bundle").roots[0]?.children.map((shape) => shape.label)).toEqual([
      "rect#first",
      "rect#last"
    ]);
  });

  it("uses the SVG root when selected shapes belong to separate top-level branches", () => {
    const document = new SvgDocument(800, 600);
    document.create("rect", "before", ["0", "0", "1", "1"]);
    document.create("g", "left", []);
    document.create("rect", "first", ["1", "0", "1", "1"], "left");
    document.create("g", "right", []);
    document.create("rect", "last", ["2", "0", "1", "1"], "right");
    const before = document.tree();

    const receipt = document.group("bundle", ["last", "first"]);
    expect(document.tree().roots.map((shape) => shape.label)).toEqual([
      "rect#before",
      "g#bundle",
      "g#left",
      "g#right"
    ]);
    document.undoGroup(receipt);
    expect(document.tree()).toEqual(before);
  });

  it("keeps selected subtrees addressable and rejects ancestors mixed with descendants", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "outer", []);
    document.create("g", "nested", [], "outer");
    document.create("rect", "child", ["0", "0", "1", "1"], "nested");
    const before = document.tree();

    expect(() => document.group("bad", ["child", "nested"])).toThrow(
      "cannot group a container into its own descendant: nested"
    );
    expect(document.tree()).toEqual(before);

    const receipt = document.group("bundle", ["nested"]);
    expect(document.tree("child").roots[0]?.label).toBe("rect#child");
    document.undoGroup(receipt);
    expect(document.tree()).toEqual(before);
  });

  it("rejects all invalid inputs before mutating the document", () => {
    const document = new SvgDocument(800, 600);
    document.create("rect", "r1", ["0", "0", "1", "1"]);
    const before = document.tree();

    expect(() => document.group("r1", ["r1"])).toThrow("id already exists: r1");
    expect(() => document.group("bad", ["missing"])).toThrow("no such shape: missing");
    expect(() => document.group("bad", ["r1", "r1"])).toThrow("duplicate group target: r1");
    expect(() => document.group("bad", [])).toThrow("group requires at least one shape");
    expect(() => document.group("bad id", ["r1"])).toThrow("invalid id: bad id");
    expect(document.tree()).toEqual(before);
  });
});
