import { describe, expect, it } from "vitest";
import { EditorSession } from "../../src/editor/EditorSession";

describe("delete command history", () => {
  it("deletes a container as one unit and restores its descendants on undo", () => {
    const session = new EditorSession();
    session.init();
    session.create("g", "group", []);
    session.create("rect", "child", ["0", "0", "1", "1"], "group");
    const before = session.tree();

    expect(session.delete("group")).toMatchObject({ label: "g#group", action: "deleted" });
    expect(session.tree().roots).toEqual([]);
    expect(session.undo()).toMatchObject({ label: "g#group", action: "restored" });
    expect(session.tree()).toEqual(before);
    expect(session.redo()).toMatchObject({ label: "g#group", action: "deleted" });
    expect(session.tree().roots).toEqual([]);
  });

  it("preserves history on failed delete and clears redo after a later edit", () => {
    const session = new EditorSession();
    session.init();
    session.create("rect", "first", ["0", "0", "1", "1"]);
    expect(() => session.delete("missing")).toThrow("no such shape: missing");

    session.delete("first");
    session.undo();
    session.create("rect", "second", ["1", "1", "1", "1"]);
    expect(() => session.redo()).toThrow("nothing to redo");
    expect(session.tree().roots.map((shape) => shape.label)).toEqual(["rect#first", "rect#second"]);
  });

  it("restores a deleted group before older create commands are undone", () => {
    const session = new EditorSession();
    session.init();
    session.create("g", "group", []);
    session.create("rect", "child", ["0", "0", "1", "1"], "group");
    session.delete("group");

    session.undo();
    expect(session.tree("child").roots[0]?.label).toBe("rect#child");
    session.undo();
    expect(session.tree("group").roots[0]?.children).toEqual([]);
    session.undo();
    expect(session.tree().roots).toEqual([]);
  });

  it("undoes and redoes successive deletions in the original sibling order", () => {
    const session = new EditorSession();
    session.init();
    session.create("rect", "left", ["0", "0", "1", "1"]);
    session.create("rect", "middle", ["1", "0", "1", "1"]);
    session.create("rect", "right", ["2", "0", "1", "1"]);
    const original = session.tree();

    session.delete("left");
    session.delete("middle");
    session.undo();
    session.undo();
    expect(session.tree()).toEqual(original);
    session.redo();
    session.redo();
    expect(session.tree().roots.map((shape) => shape.label)).toEqual(["rect#right"]);
  });

  it("keeps the I/O history barrier after a failed deletion", () => {
    const session = new EditorSession();
    session.init();

    expect(() => session.delete("missing")).toThrow("no such shape: missing");
    expect(() => session.undo()).toThrow("undo not allowed after io command");
  });
});
