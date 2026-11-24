import { describe, expect, it } from "vitest";
import type { ShapeView, TreeView } from "../../src/core/plugin-api";
import { StatsCommand } from "../../plugins/stats/StatsCommand";
import { CliApp } from "../../src/host/cli/CliApp";
import { createDefaultEditorSession } from "../support/createDefaultEditorSession";

function leaf(kind: string, label: string): ShapeView {
  return { kind, isContainer: false, label, details: [], children: [] };
}

function container(label: string, children: readonly ShapeView[]): ShapeView {
  return { kind: "g", isContainer: true, label, details: [], children };
}

describe("stats command", () => {
  it("counts leaves in depth-first order using semantic types, including nested containers", () => {
    const roots = [
      container("g#outer", [
        leaf("rect", "text#misleading"),
        container("g#box (box)", [leaf("rect", "rect#inner")]),
        leaf("rect", "rect#third")
      ]),
      leaf("circle", "circle#one"),
      leaf("text", "text#first"),
      leaf("text", "text#second")
    ];
    const tree: TreeView = { width: 100, height: 100, roots };
    const command = new StatsCommand(() => tree);

    expect(command.execute([])).toEqual(["rect: 3  circle: 1  text: 2  (total 6, containers 2)"]);
    expect(tree.roots).toEqual(roots);
  });

  it("handles an empty canvas and empty containers, and rejects arguments", () => {
    let tree: TreeView = { width: 100, height: 100, roots: [] };
    const command = new StatsCommand(() => tree);
    expect(command.execute([])).toEqual(["(total 0, containers 0)"]);
    tree = { ...tree, roots: [container("g#empty", [])] };
    expect(command.execute([])).toEqual(["(total 0, containers 1)"]);
    expect(() => command.execute(["extra"])).toThrow("usage: stats");
  });

  it("is independently registered in the CLI and leaves redo history intact", () => {
    const session = createDefaultEditorSession();
    const app = new CliApp(session, [new StatsCommand(() => session.tree())]);
    expect(app.runLine("stats")).toEqual(["error: no document. use 'init' or 'read' first"]);
    app.runLine("init");
    expect(app.runLine("stats")).toEqual(["(total 0, containers 0)"]);
    app.runLine("create rect r 0 0 1 1");
    app.runLine("undo");
    expect(app.runLine("stats")).toEqual(["(total 0, containers 0)"]);
    expect(app.runLine("redo")).toEqual(["rect#r created"]);
    expect(app.runLine("help").at(-1)).toBe("  stats");
    expect(new CliApp(createDefaultEditorSession()).runLine("stats")).toEqual([
      "error: unknown command: stats"
    ]);
  });
});
