import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";

describe("SvgDocument deletion", () => {
  it("removes a nested subtree and restores its ids, parent and sibling position", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "outer", []);
    document.create("rect", "before", ["0", "0", "1", "1"], "outer");
    document.create("g", "nested", [], "outer");
    document.create("circle", "child", ["2", "2", "1"], "nested");
    document.create("rect", "after", ["3", "3", "1", "1"], "outer");
    const original = document.tree();

    const deletion = document.delete("nested");
    expect(document.tree("outer").roots[0]?.children.map((child) => child.label)).toEqual([
      "rect#before",
      "rect#after"
    ]);
    expect(() => document.tree("child")).toThrow("no such shape: child");

    document.restoreDeletion(deletion);
    expect(document.tree()).toEqual(original);
  });

  it("restores a root leaf at its original index", () => {
    const document = new SvgDocument(800, 600);
    document.create("rect", "left", ["0", "0", "1", "1"]);
    document.create("rect", "middle", ["1", "0", "1", "1"]);
    document.create("rect", "right", ["2", "0", "1", "1"]);

    const deletion = document.delete("middle");
    expect(document.tree().roots.map((shape) => shape.label)).toEqual(["rect#left", "rect#right"]);
    document.restoreDeletion(deletion);
    expect(document.tree().roots.map((shape) => shape.label)).toEqual([
      "rect#left",
      "rect#middle",
      "rect#right"
    ]);
  });

  it("rejects an unknown id without changing the document", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "group", []);
    const before = document.tree();

    expect(() => document.delete("missing")).toThrow("no such shape: missing");
    expect(document.tree()).toEqual(before);
  });

  it("does not partially restore a subtree when one of its ids is reused", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "group", []);
    document.create("rect", "child", ["0", "0", "1", "1"], "group");
    const deletion = document.delete("group");
    document.create("rect", "child", ["2", "2", "1", "1"]);
    const before = document.tree();

    expect(() => {
      document.restoreDeletion(deletion);
    }).toThrow("cannot restore a shape with an existing id: child");
    expect(document.tree()).toEqual(before);
  });
});
