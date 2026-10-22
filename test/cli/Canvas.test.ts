import { describe, expect, it } from "vitest";
import { CliApp } from "../../src/cli/CliApp";
import { EditorSession } from "../../src/editor/EditorSession";

describe("canvas CLI command", () => {
  it("queries and resizes the canvas without disturbing shapes", () => {
    const app = new CliApp(new EditorSession());
    expect(app.runLine("canvas")).toEqual(["error: no document. use 'init' or 'read' first"]);
    app.runLine("init");
    app.runLine("create rect r1 1 2 3 4");

    expect(app.runLine("canvas")).toEqual(["canvas 800x600"]);
    expect(app.runLine("canvas 400.5 300")).toEqual(["canvas 400.5x300 resized"]);
    expect(app.runLine("tree r1")).toEqual(["rect#r1 x=1 y=2 w=3 h=4"]);
    expect(app.runLine("tree")[0]).toBe("svg (400.5x300)");
    expect(app.runLine("undo")).toEqual(["error: undo not allowed after io command"]);
  });

  it("keeps document and history unchanged after invalid input", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create rect r1 1 2 3 4");
    const before = app.runLine("tree");

    expect(app.runLine("canvas 0 300")).toEqual([
      "error: canvas dimensions must be positive finite numbers"
    ]);
    expect(app.runLine("canvas 400 Infinity")).toEqual([
      "error: canvas dimensions must be positive finite numbers"
    ]);
    expect(app.runLine("canvas 400")).toEqual(["error: usage: canvas [w] [h]"]);
    expect(app.runLine("canvas 400 300 extra")).toEqual(["error: usage: canvas [w] [h]"]);
    expect(app.runLine("tree")).toEqual(before);
    expect(app.runLine("undo")).toEqual(["rect#r1 creation undone"]);
  });
});
