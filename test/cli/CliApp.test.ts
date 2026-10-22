import { describe, expect, it } from "vitest";
import { CliApp } from "../../src/cli/CliApp";
import { EditorSession } from "../../src/editor/EditorSession";

describe("initial CLI slice", () => {
  it("replays init, nested creation and tree with the specified output", () => {
    const app = new CliApp(new EditorSession());

    expect(app.runLine("init 800 600")).toEqual(["canvas 800x600 created"]);
    expect(app.runLine("create g node1")).toEqual(["g#node1 created"]);
    expect(app.runLine("create rect start 120 100 160 60 #4a90d9 in node1")).toEqual([
      "rect#start created in g#node1"
    ]);
    expect(app.runLine("tree")).toEqual([
      "svg (800x600)",
      "└── g#node1",
      "    └── rect#start x=120 y=100 w=160 h=60 fill=#4a90d9"
    ]);
  });

  it("ignores comments and emits one error line for failed commands", () => {
    const app = new CliApp(new EditorSession());
    expect(app.runLine("# create g ignored")).toEqual([]);
    expect(app.runLine("create g node1")).toEqual([
      "error: no document. use 'init' or 'read' first"
    ]);
    app.runLine("init");
    app.runLine("create g node1");
    const before = app.runLine("tree");

    expect(app.runLine("create g node1")).toEqual(["error: id already exists: node1"]);
    expect(app.runLine("create rect r1 0 0 1 1 in missing")).toEqual([
      "error: no such container: missing"
    ]);
    expect(app.runLine('create box b1 0 0 10 10 "Title"')).toEqual([
      "error: unknown shape type: box (is the plugin loaded?)"
    ]);
    expect(app.runLine("tree")).toEqual(before);
  });

  it("supports a subtree query without adding absent fill to the display", () => {
    const app = new CliApp(new EditorSession());
    expect(app.runLine("init")).toEqual(["canvas 800x600 created"]);
    app.runLine("create rect r1 1.5 2 3 4");

    expect(app.runLine("tree r1")).toEqual(["rect#r1 x=1.5 y=2 w=3 h=4"]);
    expect(app.runLine("tree")).toEqual(["svg (800x600)", "└── rect#r1        x=1.5 y=2 w=3 h=4"]);
  });
});
