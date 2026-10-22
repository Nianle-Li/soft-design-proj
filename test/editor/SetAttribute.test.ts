import { describe, expect, it } from "vitest";
import { EditorSession } from "../../src/editor/EditorSession";

describe("set command history", () => {
  it("restores a pre-existing style and keeps each set as one history unit", () => {
    const session = new EditorSession();
    session.init();
    session.create("rect", "r1", ["1", "2", "3", "4", "red"]);

    session.set("r1", "fill", "blue");
    session.set("r1", "x", "9");
    expect(session.tree("r1").roots[0]?.details).toBe("x=9 y=2 w=3 h=4 fill=blue");
    session.undo();
    expect(session.tree("r1").roots[0]?.details).toBe("x=1 y=2 w=3 h=4 fill=blue");
    session.undo();
    expect(session.tree("r1").roots[0]?.details).toBe("x=1 y=2 w=3 h=4 fill=red");
    session.redo();
    session.redo();
    expect(session.tree("r1").roots[0]?.details).toBe("x=9 y=2 w=3 h=4 fill=blue");
  });

  it("preserves redo after a failed set and clears it after a successful new set", () => {
    const session = new EditorSession();
    session.init();
    session.create("rect", "r1", ["1", "2", "3", "4"]);
    session.set("r1", "fill", "blue");
    session.undo();

    expect(() => session.set("r1", "unknown", "x")).toThrow("unknown attribute: unknown");
    session.redo();
    expect(session.tree("r1").roots[0]?.details).toContain("fill=blue");
    session.undo();
    session.set("r1", "fill", "green");
    expect(() => session.redo()).toThrow("nothing to redo");
  });
});
