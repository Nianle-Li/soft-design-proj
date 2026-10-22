import { describe, expect, it } from "vitest";
import { CliApp } from "../../src/cli/CliApp";
import { EditorSession } from "../../src/editor/EditorSession";

describe("front/back CLI commands", () => {
  it("uses the SVG painting order and reports undo and redo", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create rect a 0 0 1 1");
    app.runLine("create rect b 0 0 1 1");

    expect(app.runLine("front a")).toEqual(["rect#a moved to front"]);
    expect(
      app
        .runLine("tree")
        .slice(1)
        .map((line) => line.match(/rect#[ab]/)?.[0])
    ).toEqual(["rect#b", "rect#a"]);
    expect(app.runLine("undo")).toEqual(["rect#a order restored"]);
    expect(app.runLine("back b")).toEqual(["rect#b moved to back"]);
    expect(
      app
        .runLine("tree")
        .slice(1)
        .map((line) => line.match(/rect#[ab]/)?.[0])
    ).toEqual(["rect#b", "rect#a"]);
  });

  it("reports invalid syntax and missing shapes without changing the tree or history", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create rect a 0 0 1 1");
    const before = app.runLine("tree");

    expect(app.runLine("front missing")).toEqual(["error: no such shape: missing"]);
    expect(app.runLine("back")).toEqual(["error: usage: back <id>"]);
    expect(app.runLine("front a extra")).toEqual(["error: usage: front <id>"]);
    expect(app.runLine("tree")).toEqual(before);
    expect(app.runLine("undo")).toEqual(["rect#a creation undone"]);
  });
});
