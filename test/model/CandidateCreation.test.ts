import { describe, expect, it } from "vitest";
import { GroupShape } from "../../src/builtin/shapes/GroupShape";
import { RectShape } from "../../src/builtin/shapes/RectShape";
import { createDefaultDocument } from "../support/createDefaultDocument";
import { TextShape } from "../../src/builtin/shapes/TextShape";

function candidate(id = "card") {
  const group = new GroupShape(id);
  group.insertChild(0, new RectShape(`${id}-rect`, 1, 2, 3, 4));
  group.insertChild(1, new TextShape(`${id}-label`, 2, 3, "title"));
  return group;
}

describe("detached candidate creation", () => {
  it("indexes a complete subtree as one creation and removes/restores it as one unit", () => {
    const document = createDefaultDocument(100, 100);
    document.createCandidate(new GroupShape("outer"));
    const receipt = document.createCandidate(candidate(), "outer");

    expect(receipt).toEqual({ label: "g#card", parentLabel: "g#outer" });
    expect(document.tree("outer").roots[0]?.children[0]?.children).toHaveLength(2);
    expect(document.show("card-rect").label).toBe("rect#card-rect");
    expect(document.show("card-label").label).toBe("text#card-label");

    document.undoCreation(receipt);
    expect(document.tree("outer").roots[0]?.children).toEqual([]);
    expect(() => document.show("card-rect")).toThrow("no such shape: card-rect");
    document.restoreCreation(receipt);
    expect(document.tree("outer").roots[0]?.children[0]?.children).toHaveLength(2);
  });

  it.each([
    [
      "internal duplicate",
      () => {
        const group = candidate();
        group.insertChild(2, new RectShape("card-rect", 0, 0, 1, 1));
        return group;
      },
      "id already exists: card-rect"
    ],
    [
      "invalid descendant id",
      () => {
        const group = candidate();
        group.insertChild(2, new RectShape("bad id", 0, 0, 1, 1));
        return group;
      },
      "invalid id: bad id"
    ],
    [
      "shared node",
      () => {
        const group = new GroupShape("shared");
        const leaf = new RectShape("leaf", 0, 0, 1, 1);
        group.insertChild(0, leaf);
        group.insertChild(1, leaf);
        return group;
      },
      "duplicate shape instance"
    ],
    [
      "cycle",
      () => {
        const group = new GroupShape("cycle");
        group.insertChild(0, group);
        return group;
      },
      "duplicate shape instance"
    ]
  ] as const)("rejects a %s before changing the document", (_name, make, error) => {
    const document = createDefaultDocument(100, 100);
    document.createCandidate(new RectShape("existing", 0, 0, 1, 1));
    const before = document.tree();

    expect(() => document.createCandidate(make())).toThrow(error);
    expect(document.tree()).toEqual(before);
    expect(document.show("existing").label).toBe("rect#existing");
  });

  it("rejects a descendant id colliding with an existing shape", () => {
    const document = createDefaultDocument(100, 100);
    document.createCandidate(new RectShape("card-label", 0, 0, 1, 1));
    const before = document.tree();

    expect(() => document.createCandidate(candidate())).toThrow("id already exists: card-label");
    expect(document.tree()).toEqual(before);
    expect(() => document.show("card")).toThrow("no such shape: card");
  });

  it("indexes nested descendants and restores their original source order", () => {
    const document = createDefaultDocument(100, 100);
    const root = new GroupShape("root");
    const nested = candidate();
    root.insertChild(0, new RectShape("before", 0, 0, 1, 1));
    root.insertChild(1, nested);
    const receipt = document.createCandidate(root);

    expect(document.show("card-rect").parentLabel).toBe("g#card");
    expect(document.tree().roots[0]?.children.map((child) => child.label)).toEqual([
      "rect#before",
      "g#card"
    ]);

    document.undoCreation(receipt);
    expect(() => document.show("card-rect")).toThrow("no such shape: card-rect");
    document.restoreCreation(receipt);
    expect(document.tree().roots[0]?.children[1]?.children.map((child) => child.label)).toEqual([
      "rect#card-rect",
      "text#card-label"
    ]);
  });

  it("rejects redo when a descendant id has been claimed, without partial attachment", () => {
    const document = createDefaultDocument(100, 100);
    const receipt = document.createCandidate(candidate());
    document.undoCreation(receipt);
    document.createCandidate(new RectShape("card-label", 0, 0, 1, 1));
    const before = document.tree();

    expect(() => {
      document.restoreCreation(receipt);
    }).toThrow("id already exists: card-label");
    expect(document.tree()).toEqual(before);
    expect(() => document.show("card")).toThrow("no such shape: card");
    expect(() => document.show("card-rect")).toThrow("no such shape: card-rect");
  });

  it("does not undo later child additions out of order", () => {
    const document = createDefaultDocument(100, 100);
    const receipt = document.createCandidate(candidate());
    document.createCandidate(new RectShape("later", 0, 0, 1, 1), "card");
    const before = document.tree();

    expect(() => {
      document.undoCreation(receipt);
    }).toThrow("cannot undo creation of a non-empty group");
    expect(document.tree()).toEqual(before);
  });
});
