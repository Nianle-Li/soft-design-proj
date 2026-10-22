import { describe, expect, it } from "vitest";
import { EditorSession } from "../../src/editor/EditorSession";

describe("EditorSession initial edit history", () => {
  it.each([
    { type: "circle", parameters: ["1", "2", "3"] },
    { type: "ellipse", parameters: ["1", "2", "3", "4"] },
    { type: "line", parameters: ["1", "2", "3", "4", "black"] },
    { type: "text", parameters: ["1", "2", "label"] }
  ])("undoes and redoes a nested $type creation", ({ type, parameters }) => {
    const session = new EditorSession();
    session.init();
    session.create("g", "parent", []);
    session.create(type, "child", parameters, "parent");

    expect(session.tree("parent").roots[0]?.children).toHaveLength(1);
    session.undo();
    expect(session.tree("parent").roots[0]?.children).toHaveLength(0);
    session.redo();
    expect(session.tree("parent").roots[0]?.children).toHaveLength(1);
  });

  it("creates shapes as commands and undoes/redoes the latest creation", () => {
    const session = new EditorSession();
    session.init();
    session.create("g", "node1", []);
    session.create("rect", "start", ["120", "100", "160", "60"], "node1");

    expect(session.tree().roots[0]?.children).toHaveLength(1);
    session.undo();
    expect(session.tree().roots[0]?.children).toHaveLength(0);
    session.redo();
    expect(session.tree().roots[0]?.children).toHaveLength(1);
  });

  it("keeps undo history after a failed edit and clears redo after a new edit", () => {
    const session = new EditorSession();
    session.init();
    session.create("g", "node1", []);
    session.create("rect", "start", ["1", "2", "3", "4"], "node1");

    expect(() => session.create("rect", "start", ["1", "2", "3", "4"])).toThrow(
      "id already exists: start"
    );
    session.undo();
    expect(session.tree().roots[0]?.children).toHaveLength(0);
    session.create("rect", "next", ["1", "2", "3", "4"], "node1");
    expect(() => session.redo()).toThrow("nothing to redo");
  });

  it("reports the specified error before a document exists", () => {
    const session = new EditorSession();
    expect(() => session.create("g", "node1", [])).toThrow(
      "no document. use 'init' or 'read' first"
    );
  });

  it("keeps the init history barrier through a read-only tree query", () => {
    const session = new EditorSession();
    session.init();
    session.tree();

    expect(() => session.undo()).toThrow("undo not allowed after io command");
    session.create("g", "node1", []);
    session.undo();
    expect(session.tree().roots).toEqual([]);
  });
});
