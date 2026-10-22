import { describe, expect, it } from "vitest";
import { CliApp } from "../../src/cli/CliApp";
import { EditorSession } from "../../src/editor/EditorSession";

describe("addto CLI command", () => {
  it("moves an existing shape into a group and reports undo and redo", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create rect r1 0 0 1 1");
    app.runLine("create g target");

    expect(app.runLine("addto target r1")).toEqual(["rect#r1 added to g#target"]);
    expect(app.runLine("tree target")).toEqual(["g#target", "└── rect#r1        x=0 y=0 w=1 h=1"]);
    expect(app.runLine("undo")).toEqual(["rect#r1 restored to canvas"]);
    expect(app.runLine("redo")).toEqual(["rect#r1 added to g#target"]);
  });

  it("emits one error line for invalid placement and preserves state", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create g outer");
    app.runLine("create g inner in outer");
    const before = app.runLine("tree");

    expect(app.runLine("addto inner outer")).toEqual([
      "error: cannot add a container into itself or its descendant: outer"
    ]);
    expect(app.runLine("addto outer missing")).toEqual(["error: no such shape: missing"]);
    expect(app.runLine("addto outer")).toEqual(["error: usage: addto <gid> <id>"]);
    expect(app.runLine("tree")).toEqual(before);
    expect(app.runLine("undo")).toEqual(["g#inner creation undone"]);
  });
});
