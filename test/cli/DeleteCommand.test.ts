import { describe, expect, it } from "vitest";
import { CliApp } from "../../src/cli/CliApp";
import { EditorSession } from "../../src/editor/EditorSession";

describe("delete CLI command", () => {
  it("uses the assignment's delete and restore output inside a group", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create g markers");
    app.runLine("create rect box 0 0 10 10 in markers");
    const before = app.runLine("tree");

    expect(app.runLine("delete box")).toEqual(["rect#box deleted"]);
    expect(app.runLine("undo")).toEqual(["rect#box restored into g#markers"]);
    expect(app.runLine("tree")).toEqual(before);
    expect(app.runLine("redo")).toEqual(["rect#box deleted"]);
  });

  it("rejects an absent target and bad arity with one error line and no state change", () => {
    const app = new CliApp(new EditorSession());
    expect(app.runLine("delete x")).toEqual(["error: no document. use 'init' or 'read' first"]);
    app.runLine("init");
    app.runLine("create rect r1 0 0 1 1");
    const before = app.runLine("tree");

    expect(app.runLine("delete missing")).toEqual(["error: no such shape: missing"]);
    expect(app.runLine("delete r1 extra")).toEqual(["error: usage: delete <id>"]);
    expect(app.runLine("tree")).toEqual(before);
    expect(app.runLine("undo")).toEqual(["rect#r1 creation undone"]);
  });
});
