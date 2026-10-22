import { describe, expect, it } from "vitest";
import { EditorSession } from "../../src/editor/EditorSession";

describe("scale command history", () => {
  it("scales a group as one history unit and redoes after an exact undo", () => {
    const session = new EditorSession();
    session.init();
    session.create("g", "group", []);
    session.create("rect", "r1", ["0.1", "0.2", "3", "4"], "group");
    const before = session.tree();

    session.scale("group", 0.2);
    const after = session.tree();
    expect(after).not.toEqual(before);
    session.undo();
    expect(session.tree()).toEqual(before);
    session.redo();
    expect(session.tree()).toEqual(after);
  });

  it("preserves undo history after a failed scale and clears redo after a new edit", () => {
    const session = new EditorSession();
    session.init();
    session.create("rect", "r1", ["1", "2", "3", "4"]);
    const before = session.tree();

    expect(() => session.scale("r1", 0)).toThrow("scale factor must be positive");
    expect(session.tree()).toEqual(before);
    session.scale("r1", 2);
    session.undo();
    session.move("r1", 1, 1);
    expect(() => session.redo()).toThrow("nothing to redo");
  });
});
