import { describe, expect, it } from "vitest";
import { CliApp } from "../../src/cli/CliApp";
import { EditorSession } from "../../src/editor/EditorSession";

describe("scale CLI command", () => {
  it("scales nested content while preserving its existing style and text", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create g group");
    app.runLine("create rect r1 1 2 3 4 red in group");
    app.runLine('create text label 5 6 "hello" in group');
    const before = app.runLine("tree");

    expect(app.runLine("scale group 2")).toEqual(["g#group scaled by 2"]);
    expect(app.runLine("tree r1")).toEqual(["rect#r1 x=2 y=4 w=6 h=8 fill=red"]);
    expect(app.runLine("tree label")).toEqual(['text#label (10,12) "hello"']);
    expect(app.runLine("undo")).toEqual(["g#group scale undone"]);
    expect(app.runLine("tree")).toEqual(before);
    expect(app.runLine("redo")).toEqual(["g#group scaled by 2"]);
  });

  it("reports the specified non-positive-factor error without changing state or history", () => {
    const app = new CliApp(new EditorSession());
    expect(app.runLine("scale r1 2")).toEqual(["error: no document. use 'init' or 'read' first"]);
    app.runLine("init");
    app.runLine("create rect r1 1 2 3 4");
    const before = app.runLine("tree");

    expect(app.runLine("scale r1 0")).toEqual(["error: scale factor must be positive"]);
    expect(app.runLine("scale r1 -1")).toEqual(["error: scale factor must be positive"]);
    expect(app.runLine("scale r1 Infinity")).toEqual(["error: invalid number: Infinity"]);
    expect(app.runLine("scale missing 2")).toEqual(["error: no such shape: missing"]);
    expect(app.runLine("scale r1")).toEqual(["error: usage: scale <id> <factor>"]);
    expect(app.runLine("tree")).toEqual(before);
    expect(app.runLine("undo")).toEqual(["rect#r1 creation undone"]);
  });
});
