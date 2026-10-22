import { describe, expect, it } from "vitest";
import { CliApp } from "../../src/cli/CliApp";
import { EditorSession } from "../../src/editor/EditorSession";

describe("move CLI command", () => {
  it("matches the assignment's circle move, undo and redo feedback", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create circle c1 100 100 20 red");

    expect(app.runLine("move c1 30 0")).toEqual(["circle#c1 moved to (130,100)"]);
    expect(app.runLine("undo")).toEqual(["circle#c1 moved back to (100,100)"]);
    expect(app.runLine("redo")).toEqual(["circle#c1 moved to (130,100)"]);
  });

  it("matches the assignment's group displacement feedback and moves descendants", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create g node2");
    app.runLine('create text label 545 135 "处理数据" in node2');

    expect(app.runLine("move node2 0 100")).toEqual(["g#node2 moved by (0,100)"]);
    expect(app.runLine("tree label")).toEqual(['text#label (545,235) "处理数据"']);
    expect(app.runLine("undo")).toEqual(["g#node2 moved back by (0,-100)"]);
    expect(app.runLine("tree label")).toEqual(['text#label (545,135) "处理数据"']);
  });

  it("reports one error line for invalid input and preserves the previous undo unit", () => {
    const app = new CliApp(new EditorSession());
    expect(app.runLine("move r1 1 2")).toEqual(["error: no document. use 'init' or 'read' first"]);
    app.runLine("init");
    app.runLine("create rect r1 1 2 3 4");
    const before = app.runLine("tree");

    expect(app.runLine("move r1 1")).toEqual(["error: usage: move <id> <dx> <dy>"]);
    expect(app.runLine("move missing 1 2")).toEqual(["error: no such shape: missing"]);
    expect(app.runLine("move r1 Infinity 2")).toEqual(["error: invalid number: Infinity"]);
    expect(app.runLine("tree")).toEqual(before);
    expect(app.runLine("undo")).toEqual(["rect#r1 creation undone"]);
  });
});
