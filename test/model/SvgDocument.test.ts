import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";

describe("SvgDocument creation", () => {
  it("places a rectangle in an existing group and exposes a read-only tree", () => {
    const document = new SvgDocument(800, 600);

    document.create("g", "node1", []);
    document.create("rect", "start", ["120", "100", "160", "60", "#4a90d9"], "node1");

    expect(document.tree()).toEqual({
      width: 800,
      height: 600,
      roots: [
        {
          label: "g#node1",
          details: "",
          children: [
            {
              label: "rect#start",
              details: "x=120 y=100 w=160 h=60 fill=#4a90d9",
              children: []
            }
          ]
        }
      ]
    });
  });

  it("rejects duplicate ids and invalid containers without changing the tree", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "node1", []);
    document.create("rect", "start", ["1", "2", "3", "4"], "node1");
    const before = document.tree();

    expect(() => document.create("rect", "start", ["1", "2", "3", "4"])).toThrow(
      "id already exists: start"
    );
    expect(() => document.create("rect", "other", ["1", "2", "3", "4"], "missing")).toThrow(
      "no such container: missing"
    );
    expect(() => document.create("g", "child", [], "start")).toThrow("not a container: start");
    expect(document.tree()).toEqual(before);
  });

  it("treats ids as case sensitive and rejects future-stage box", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "Node", []);
    document.create("g", "node", []);

    expect(document.tree().roots).toHaveLength(2);
    expect(() => document.create("box", "b1", ["0", "0", "10", "10", "title"])).toThrow(
      "unknown shape type: box (is the plugin loaded?)"
    );
  });

  it("rejects an unusable id and invalid canvas without creating partial state", () => {
    expect(() => new SvgDocument(0, 600)).toThrow(
      "canvas dimensions must be positive finite numbers"
    );

    const document = new SvgDocument(800, 600);
    expect(() => document.create("g", "", [])).toThrow("invalid id:");
    expect(() => document.create("g", "two words", [])).toThrow("invalid id: two words");
    expect(document.tree().roots).toEqual([]);
  });

  it("does not orphan descendants when a creation receipt is used out of order", () => {
    const document = new SvgDocument(800, 600);
    const group = document.create("g", "parent", []);
    document.create("rect", "child", ["0", "0", "1", "1"], "parent");
    const before = document.tree();

    expect(() => {
      document.undoCreation(group);
    }).toThrow("cannot undo creation of a non-empty group");
    expect(document.tree()).toEqual(before);
  });
});
