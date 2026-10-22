import { describe, expect, it } from "vitest";
import { EditorSession } from "../../src/editor/EditorSession";

describe("addto command history", () => {
  it("moves across parents as one unit and restores the source position", () => {
    const session = new EditorSession();
    session.init();
    session.create("g", "source", []);
    session.create("g", "target", []);
    session.create("rect", "a", ["0", "0", "1", "1"], "source");
    session.create("rect", "b", ["1", "0", "1", "1"], "source");
    const before = session.tree();

    expect(session.addTo("target", "a")).toMatchObject({
      label: "rect#a",
      action: "added",
      parentLabel: "g#target"
    });
    expect(session.undo()).toMatchObject({
      label: "rect#a",
      action: "restored",
      parentLabel: "g#source"
    });
    expect(session.tree()).toEqual(before);
    expect(session.redo()).toMatchObject({ label: "rect#a", action: "added" });
  });

  it("does not change history after a cycle error", () => {
    const session = new EditorSession();
    session.init();
    session.create("g", "outer", []);
    session.create("g", "inner", [], "outer");
    const before = session.tree();

    expect(() => session.addTo("inner", "outer")).toThrow(
      "cannot add a container into itself or its descendant: outer"
    );
    expect(session.tree()).toEqual(before);
    expect(session.undo()).toMatchObject({ label: "g#inner", action: "removed" });
  });
});
