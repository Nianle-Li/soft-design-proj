import { describe, expect, it } from "vitest";
import { EditorSession } from "../../src/editor/EditorSession";

describe("move command history", () => {
  it("moves a nested group as one undo unit and redoes the same displacement", () => {
    const session = new EditorSession();
    session.init();
    session.create("g", "group", []);
    session.create("circle", "child", ["10", "20", "5"], "group");
    const before = session.tree();

    session.move("group", 2, -3);
    expect(session.show("child").geometry).toEqual([
      ["cx", "12"],
      ["cy", "17"],
      ["r", "5"]
    ]);
    session.undo();
    expect(session.tree()).toEqual(before);
    session.redo();
    expect(session.show("child").geometry).toEqual([
      ["cx", "12"],
      ["cy", "17"],
      ["r", "5"]
    ]);
  });

  it("keeps both history and geometry unchanged after a failed move", () => {
    const session = new EditorSession();
    session.init();
    session.create("rect", "r1", ["1", "2", "3", "4"]);
    const before = session.tree();

    expect(() => session.move("r1", Number.POSITIVE_INFINITY, 0)).toThrow("invalid move delta");
    expect(session.tree()).toEqual(before);
    session.undo();
    expect(session.tree().roots).toEqual([]);
  });

  it("restores exact decimal coordinates instead of relying on inverse floating-point arithmetic", () => {
    const session = new EditorSession();
    session.init();
    session.create("rect", "r1", ["0.1", "0.2", "3", "4"]);
    const before = session.tree();

    session.move("r1", 0.2, 0.3);
    const moved = session.tree();
    expect(moved).not.toEqual(before);
    session.undo();
    expect(session.tree()).toEqual(before);
    session.redo();
    expect(session.tree()).toEqual(moved);
  });
});
