import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";
import { createFromCommand } from "../support/createFromCommand";

describe("SvgDocument creation", () => {
  it("places a rectangle in an existing group and exposes a read-only tree", () => {
    const document = new SvgDocument(800, 600);

    createFromCommand(document, "g", "node1", []);
    createFromCommand(document, "rect", "start", ["120", "100", "160", "60", "#4a90d9"], "node1");

    expect(document.tree()).toEqual({
      width: 800,
      height: 600,
      roots: [
        {
          label: "g#node1",
          details: [],
          children: [
            {
              label: "rect#start",
              details: [
                { kind: "attribute", name: "x", value: "120" },
                { kind: "attribute", name: "y", value: "100" },
                { kind: "attribute", name: "width", value: "160" },
                { kind: "attribute", name: "height", value: "60" },
                { kind: "attribute", name: "fill", value: "#4a90d9" }
              ],
              children: []
            }
          ]
        }
      ]
    });
  });

  it("rejects duplicate ids and invalid containers without changing the tree", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "g", "node1", []);
    createFromCommand(document, "rect", "start", ["1", "2", "3", "4"], "node1");
    const before = document.tree();

    expect(() => createFromCommand(document, "rect", "start", ["1", "2", "3", "4"])).toThrow(
      "id already exists: start"
    );
    expect(() =>
      createFromCommand(document, "rect", "other", ["1", "2", "3", "4"], "missing")
    ).toThrow("no such container: missing");
    expect(() => createFromCommand(document, "g", "child", [], "start")).toThrow(
      "not a container: start"
    );
    expect(document.tree()).toEqual(before);
  });

  it("treats ids as case sensitive and rejects future-stage box", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "g", "Node", []);
    createFromCommand(document, "g", "node", []);

    expect(document.tree().roots).toHaveLength(2);
    expect(() => createFromCommand(document, "box", "b1", ["0", "0", "10", "10", "title"])).toThrow(
      "unknown shape type: box (is the plugin loaded?)"
    );
  });

  it("rejects an unusable id and invalid canvas without creating partial state", () => {
    expect(() => new SvgDocument(0, 600)).toThrow(
      "canvas dimensions must be positive finite numbers"
    );

    const document = new SvgDocument(800, 600);
    expect(() => createFromCommand(document, "g", "", [])).toThrow("invalid id:");
    expect(() => createFromCommand(document, "g", "two words", [])).toThrow(
      "invalid id: two words"
    );
    expect(document.tree().roots).toEqual([]);
  });

  it("does not orphan descendants when a creation receipt is used out of order", () => {
    const document = new SvgDocument(800, 600);
    const group = createFromCommand(document, "g", "parent", []);
    createFromCommand(document, "rect", "child", ["0", "0", "1", "1"], "parent");
    const before = document.tree();

    expect(() => {
      document.undoCreation(group);
    }).toThrow("cannot undo creation of a non-empty group");
    expect(document.tree()).toEqual(before);
  });
});
