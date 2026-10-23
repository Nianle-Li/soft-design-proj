import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";
import { createFromCommand } from "../support/createFromCommand";
import type { CreationReceipt, DeletionReceipt } from "../../src/model/SvgDocument";
import { RectShape } from "../../src/model/RectShape";

describe("document receipt encapsulation", () => {
  it("does not expose live shapes or tree positions through edit receipts", () => {
    const document = new SvgDocument(100, 100);
    const created = createFromCommand(document, "g", "group", []);
    createFromCommand(document, "rect", "child", ["1", "2", "3", "4"], "group");
    const deleted = document.delete("child");

    expect(Reflect.ownKeys(created)).toEqual(["label"]);
    expect(Reflect.ownKeys(deleted)).toEqual(["label", "parentLabel"]);
    expect(document.tree("group").roots[0]?.children).toEqual([]);

    document.restoreDeletion(deleted);
    expect(document.show("child").label).toBe("rect#child");
  });

  it("rejects fabricated receipts without changing the document", () => {
    const document = new SvgDocument(100, 100);
    createFromCommand(document, "g", "group", []);
    const before = document.tree();

    const forgedCreation = {
      shape: new RectShape("rogue", 0, 0, 1, 1),
      parent: null,
      index: 0
    } as unknown as CreationReceipt;
    expect(() => {
      document.restoreCreation(forgedCreation);
    }).toThrow();
    expect(() => {
      document.restoreDeletion({ label: "rect#rogue" } as DeletionReceipt);
    }).toThrow();
    expect(document.tree()).toEqual(before);
  });

  it("keeps receipts bound to their originating document", () => {
    const first = new SvgDocument(100, 100);
    const second = new SvgDocument(100, 100);
    const created = createFromCommand(first, "rect", "same", ["0", "0", "1", "1"]);
    createFromCommand(second, "rect", "same", ["0", "0", "1", "1"]);
    const before = second.tree();

    expect(() => {
      second.undoCreation(created);
    }).toThrow("receipt does not belong to this document");
    expect(second.tree()).toEqual(before);
  });

  it("exposes only feedback for every edit operation", () => {
    const document = new SvgDocument(100, 100);
    createFromCommand(document, "g", "outer", []);
    createFromCommand(document, "g", "inner", [], "outer");
    createFromCommand(document, "rect", "a", ["1", "2", "3", "4"], "outer");
    createFromCommand(document, "rect", "b", ["5", "6", "7", "8"], "outer");

    const move = document.move("a", 1, 2);
    const receipts = [
      move,
      document.scale("a", 2),
      document.set("a", "fill", "red"),
      document.reorder("a", "front"),
      document.group("selection", ["a", "b"]),
      document.ungroup("selection"),
      document.addTo("inner", "a")
    ];

    expect(Object.isFrozen(move.location)).toBe(true);
    for (const receipt of receipts) {
      expect(Object.isFrozen(receipt)).toBe(true);
      expect(Reflect.ownKeys(receipt)).not.toContain("shape");
      expect(Reflect.ownKeys(receipt)).not.toContain("parent");
      expect(Reflect.ownKeys(receipt)).not.toContain("plan");
      expect(Reflect.ownKeys(receipt)).not.toContain("members");
      expect(Reflect.ownKeys(receipt)).not.toContain("index");
    }
  });
});
