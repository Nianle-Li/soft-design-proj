import { describe, expect, it } from "vitest";
import { EditorSession } from "../../src/editor/EditorSession";

describe("front/back command history", () => {
  it("undoes and redoes successive z-order edits in exact sibling order", () => {
    const session = new EditorSession();
    session.init();
    for (const id of ["a", "b", "c"]) {
      session.create("rect", id, ["0", "0", "1", "1"]);
    }
    const before = session.tree();

    expect(session.reorder("a", "front")).toMatchObject({ label: "rect#a", edge: "front" });
    expect(session.reorder("c", "back")).toMatchObject({ label: "rect#c", edge: "back" });
    expect(session.tree().roots.map((shape) => shape.label)).toEqual([
      "rect#c",
      "rect#b",
      "rect#a"
    ]);
    session.undo();
    session.undo();
    expect(session.tree()).toEqual(before);
    session.redo();
    session.redo();
    expect(session.tree().roots.map((shape) => shape.label)).toEqual([
      "rect#c",
      "rect#b",
      "rect#a"
    ]);
  });

  it("preserves the I/O barrier and current undo entry after failures", () => {
    const session = new EditorSession();
    session.init();
    expect(() => session.reorder("missing", "front")).toThrow("no such shape: missing");
    expect(() => session.undo()).toThrow("undo not allowed after io command");
    session.create("rect", "a", ["0", "0", "1", "1"]);
    const before = session.tree();
    expect(() => session.reorder("missing", "back")).toThrow("no such shape: missing");
    expect(session.tree()).toEqual(before);
    expect(session.undo()).toMatchObject({ label: "rect#a", action: "removed" });
  });
});
