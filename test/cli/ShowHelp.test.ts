import { describe, expect, it } from "vitest";
import { CliApp } from "../../src/cli/CliApp";
import { EditorSession } from "../../src/editor/EditorSession";

describe("show and help", () => {
  it("matches the assignment's circle example and leaves undo history unchanged", () => {
    const app = new CliApp(new EditorSession());
    expect(app.runLine("show c1")).toEqual(["error: no document. use 'init' or 'read' first"]);
    app.runLine("init");
    app.runLine("create g markers");
    app.runLine("create circle c1 100 100 20 red in markers");
    expect(app.runLine("show c1")).toEqual([
      "circle#c1  parent=g#markers",
      "  cx=100 cy=100 r=20",
      "  fill=red"
    ]);
    expect(app.runLine("show missing")).toEqual(["error: no such shape: missing"]);
    expect(app.runLine("show")).toEqual(["error: usage: show <id>"]);
    expect(app.runLine("show c1 extra")).toEqual(["error: usage: show <id>"]);
    expect(app.runLine("undo")).toEqual(["circle#c1 creation undone"]);
  });

  it("shows only explicit attributes for a top-level group and text", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create g layer");
    app.runLine("set layer fill #eee");
    app.runLine("set layer stroke-width 2");
    app.runLine('create text caption 10 20 "A & B" in layer');
    expect(app.runLine("show layer")).toEqual([
      "g#layer  parent=svg",
      "  fill=#eee stroke-width=2"
    ]);
    expect(app.runLine("show caption")).toEqual([
      "text#caption  parent=g#layer",
      "  x=10 y=20",
      '  text="A & B"'
    ]);
  });

  it("lists every Phase 1 command with its syntax even before init", () => {
    const app = new CliApp(new EditorSession());
    expect(app.runLine("help")).toEqual([
      "Commands:",
      "  init [w] [h]",
      "  read <file.svg>",
      "  save [file.svg]",
      "  canvas [w] [h]",
      "  create <type> <id> [params...] [in <containerId>]",
      "  delete <id>",
      "  move <id> <dx> <dy>",
      "  scale <id> <factor>",
      "  set <id> <attr> <value>",
      "  group <newGid> <id1> [id2...]",
      "  ungroup <gid>",
      "  addto <gid> <id>",
      "  front <id>",
      "  back <id>",
      "  tree [id]",
      "  show <id>",
      "  help",
      "  undo",
      "  redo"
    ]);
    expect(app.runLine("help extra")).toEqual(["error: usage: help"]);
  });
});
