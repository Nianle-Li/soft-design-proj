import { describe, expect, it } from "vitest";
import { EditorSession } from "../../src/editor/EditorSession";

describe("ungroup command history", () => {
  it("undoes and redoes one ungroup as one unit after grouping", () => {
    const session = new EditorSession();
    session.init();
    session.create("g", "outer", []);
    session.create("rect", "a", ["0", "0", "1", "1"], "outer");
    session.create("rect", "b", ["1", "0", "1", "1"], "outer");
    session.group("nested", ["a", "b"]);
    const grouped = session.tree();

    expect(session.ungroup("nested")).toMatchObject({
      label: "g#nested",
      action: "ungrouped",
      childCount: 2
    });
    expect(session.tree("outer").roots[0]?.children.map((shape) => shape.label)).toEqual([
      "rect#a",
      "rect#b"
    ]);
    expect(session.undo()).toMatchObject({ label: "g#nested", action: "regrouped" });
    expect(session.tree()).toEqual(grouped);
    expect(session.undo()).toMatchObject({ label: "g#nested", action: "ungrouped" });
    expect(session.tree("outer").roots[0]?.children.map((shape) => shape.label)).toEqual([
      "rect#a",
      "rect#b"
    ]);
    expect(session.redo()).toMatchObject({ label: "g#nested", action: "grouped" });
    expect(session.redo()).toMatchObject({ label: "g#nested", action: "ungrouped" });
  });

  it("keeps the current undo unit and I/O barrier after failures", () => {
    const session = new EditorSession();
    session.init();
    expect(() => session.ungroup("missing")).toThrow("no such shape: missing");
    expect(() => session.undo()).toThrow("undo not allowed after io command");

    session.create("g", "root", []);
    const before = session.tree();
    expect(() => session.ungroup("root")).toThrow("cannot ungroup top-level container: root");
    expect(session.tree()).toEqual(before);
    expect(session.undo()).toMatchObject({ label: "g#root", action: "removed" });
  });
});
