import { describe, expect, it } from "vitest";
import { EditorSession } from "../../src/editor/EditorSession";

describe("typed editor creation", () => {
  it("uses the same command history as CLI creation without passing token arrays", () => {
    const session = new EditorSession();
    session.init();
    expect(
      session.createShape({ kind: "rect", id: "r", x: 1, y: 2, width: 3, height: 4 })
    ).toMatchObject({
      label: "rect#r",
      action: "created"
    });
    expect(session.show("r").geometry).toEqual([
      ["x", "1"],
      ["y", "2"],
      ["width", "3"],
      ["height", "4"]
    ]);
    expect(session.undo()).toMatchObject({ label: "rect#r", action: "removed" });
    expect(session.tree().roots).toEqual([]);
    expect(session.redo()).toMatchObject({ label: "rect#r", action: "created" });
  });
});
