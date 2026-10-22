import { describe, expect, it } from "vitest";
import { CliApp } from "../../src/cli/CliApp";
import { EditorSession } from "../../src/editor/EditorSession";

describe("ungroup CLI command", () => {
  it("promotes children and reports the result with one history entry", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create g outer");
    app.runLine("create g nested in outer");
    app.runLine("create rect a 0 0 1 1 in nested");

    expect(app.runLine("ungroup nested")).toEqual(["g#nested ungrouped"]);
    expect(app.runLine("tree outer")).toEqual(["g#outer", "└── rect#a         x=0 y=0 w=1 h=1"]);
    expect(app.runLine("undo")).toEqual(["g#nested restored with 1 child"]);
    expect(app.runLine("redo")).toEqual(["g#nested ungrouped"]);
  });

  it("uses the assignment's top-level error and preserves history", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create g root");
    const before = app.runLine("tree");

    expect(app.runLine("ungroup root")).toEqual([
      "error: cannot ungroup top-level container: root"
    ]);
    expect(app.runLine("ungroup missing")).toEqual(["error: no such shape: missing"]);
    expect(app.runLine("ungroup")).toEqual(["error: usage: ungroup <gid>"]);
    expect(app.runLine("tree")).toEqual(before);
    expect(app.runLine("undo")).toEqual(["g#root creation undone"]);
  });
});
