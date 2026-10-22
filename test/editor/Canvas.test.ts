import { describe, expect, it } from "vitest";
import { EditorSession } from "../../src/editor/EditorSession";

describe("canvas session history", () => {
  it("leaves history untouched on queries and failures, then blocks history after resizing", () => {
    const session = new EditorSession();
    session.init();
    session.create("rect", "r1", ["1", "2", "3", "4"]);
    expect(session.canvas()).toEqual({ width: 800, height: 600 });
    expect(() => session.resizeCanvas(0, 300)).toThrow(
      "canvas dimensions must be positive finite numbers"
    );
    expect(session.canvas()).toEqual({ width: 800, height: 600 });

    session.undo();
    session.redo();
    session.resizeCanvas(400, 300);
    expect(session.tree().roots).toHaveLength(1);
    expect(() => session.undo()).toThrow("undo not allowed after io command");
    expect(() => session.redo()).toThrow("undo not allowed after io command");
    expect(session.canvas()).toEqual({ width: 400, height: 300 });
    expect(() => session.undo()).toThrow("undo not allowed after io command");

    session.move("r1", 1, 1);
    session.undo();
    expect(session.tree("r1").roots[0]?.details).toBe("x=1 y=2 w=3 h=4");
  });

  it("does not replace the document after resizing", () => {
    const session = new EditorSession();
    session.init();
    session.create("g", "group", []);
    session.create("rect", "r1", ["1", "2", "3", "4"], "group");

    session.resizeCanvas(100, 200);
    expect(session.tree("group").roots[0]?.children[0]?.label).toBe("rect#r1");
  });
});
