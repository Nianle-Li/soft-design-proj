import { describe, expect, it } from "vitest";
import { CliApp } from "../../src/cli/CliApp";
import { EditorSession } from "../../src/editor/EditorSession";

describe("group CLI command", () => {
  it("matches the assignment's group creation summary", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create rect bg 0 0 1 1");
    app.runLine("create circle c1 1 1 1");
    app.runLine("create rect box 2 2 1 1");

    expect(app.runLine("group markers c1 box")).toEqual(["g#markers created with 2 children"]);
    expect(app.runLine("tree markers")).toEqual([
      "g#markers",
      "├── circle#c1      cx=1 cy=1 r=1",
      "└── rect#box       x=2 y=2 w=1 h=1"
    ]);
  });

  it("reports ancestor conflicts exactly and leaves tree and history unchanged", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create g markers");
    app.runLine("create circle c1 1 1 1 in markers");
    const before = app.runLine("tree");

    expect(app.runLine("group bad c1 markers")).toEqual([
      "error: cannot group a container into its own descendant: markers"
    ]);
    expect(app.runLine("tree")).toEqual(before);
    expect(app.runLine("group bad")).toEqual(["error: usage: group <newGid> <id1> [id2...]"]);
    expect(app.runLine("undo")).toEqual(["circle#c1 creation undone"]);
  });
});
