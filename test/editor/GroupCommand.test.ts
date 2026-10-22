import { describe, expect, it } from "vitest";
import { EditorSession } from "../../src/editor/EditorSession";

describe("group command history", () => {
  it("treats a multi-target group as one undo unit and restores redo", () => {
    const session = new EditorSession();
    session.init();
    session.create("rect", "a", ["0", "0", "1", "1"]);
    session.create("rect", "b", ["1", "0", "1", "1"]);
    const before = session.tree();

    expect(session.group("bundle", ["a", "b"])).toMatchObject({
      label: "g#bundle",
      action: "grouped",
      childCount: 2
    });
    expect(session.tree().roots).toHaveLength(1);
    expect(session.undo()).toMatchObject({ label: "g#bundle", action: "ungrouped" });
    expect(session.tree()).toEqual(before);
    expect(session.redo()).toMatchObject({ label: "g#bundle", action: "grouped" });
    expect(session.tree().roots).toHaveLength(1);
  });

  it("preserves the history and I/O barrier after a failed grouping", () => {
    const session = new EditorSession();
    session.init();
    expect(() => session.group("bad", ["missing"])).toThrow("no such shape: missing");
    expect(() => session.undo()).toThrow("undo not allowed after io command");

    session.create("rect", "r1", ["0", "0", "1", "1"]);
    const before = session.tree();
    expect(() => session.group("bad", ["r1", "r1"])).toThrow("duplicate group target: r1");
    expect(session.tree()).toEqual(before);
    expect(session.undo()).toMatchObject({ label: "rect#r1", action: "removed" });
  });

  it("can undo a later member edit before undoing the group", () => {
    const session = new EditorSession();
    session.init();
    session.create("rect", "r1", ["0", "0", "1", "1"]);
    const before = session.tree();
    session.group("bundle", ["r1"]);
    session.move("r1", 4, 0);

    session.undo();
    expect(session.tree("r1")).toEqual({ ...before, roots: before.roots });
    session.undo();
    expect(session.tree()).toEqual(before);
    session.redo();
    session.redo();
    expect(session.tree("r1").roots[0]?.details).toContain("x=4");
  });
});
