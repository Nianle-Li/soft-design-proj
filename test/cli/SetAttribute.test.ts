import { describe, expect, it } from "vitest";
import { CliApp } from "../../src/cli/CliApp";
import { EditorSession } from "../../src/editor/EditorSession";

describe("set CLI command", () => {
  it("sets quoted text and geometric attributes with undo and redo", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine('create text label 1 2 "old text"');

    expect(app.runLine('set label text "new text"')).toEqual(["text#label text set to new text"]);
    expect(app.runLine("tree label")).toEqual(['text#label (1,2) "new text"']);
    expect(app.runLine("set label x 10.5")).toEqual(["text#label x set to 10.5"]);
    expect(app.runLine("undo")).toEqual(["text#label x restored to 1"]);
    expect(app.runLine("undo")).toEqual(["text#label text restored to old text"]);
    expect(app.runLine("redo")).toEqual(["text#label text set to new text"]);
  });

  it("reports the specified unknown-attribute error and leaves history unchanged", () => {
    const app = new CliApp(new EditorSession());
    expect(app.runLine("set r1 fill red")).toEqual([
      "error: no document. use 'init' or 'read' first"
    ]);
    app.runLine("init");
    app.runLine("create rect r1 1 2 3 4");
    const before = app.runLine("tree");

    expect(app.runLine("set r1 opacity 0.5")).toEqual(["error: unknown attribute: opacity"]);
    expect(app.runLine("set r1 x Infinity")).toEqual(["error: invalid number: Infinity"]);
    expect(app.runLine("set r1 x")).toEqual(["error: usage: set <id> <attr> <value>"]);
    expect(app.runLine("tree")).toEqual(before);
    expect(app.runLine("undo")).toEqual(["rect#r1 creation undone"]);
  });

  it("treats a group style as one edit and removes a previously absent value on undo", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create g group");
    app.runLine("create rect child 1 2 3 4 in group");

    expect(app.runLine("set group fill blue")).toEqual(["g#group fill set to blue"]);
    expect(app.runLine("tree child")).toEqual(["rect#child x=1 y=2 w=3 h=4"]);
    expect(app.runLine("undo")).toEqual(["g#group fill removed"]);
    expect(app.runLine("redo")).toEqual(["g#group fill set to blue"]);
  });
});
