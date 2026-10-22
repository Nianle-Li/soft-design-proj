import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CliApp } from "../../src/cli/CliApp";
import { EditorSession } from "../../src/editor/EditorSession";
import { SvgFileStore } from "../../src/svg/SvgFileStore";

describe("remaining explicit Phase 1 acceptance scenarios", () => {
  it("creates default and fractional canvases while keeping failed init atomic", () => {
    const app = new CliApp(new EditorSession());
    expect(app.runLine("init")).toEqual(["canvas 800x600 created"]);
    expect(app.runLine("init 640.5 480.25")).toEqual(["canvas 640.5x480.25 created"]);
    app.runLine("create rect r 1 2 3 4");
    expect(app.runLine("init 0 100")).toEqual([
      "error: canvas dimensions must be positive finite numbers"
    ]);
    // Single-node spacing is unspecified; the golden transcripts test specified tree layouts exactly.
    expect(app.runLine("tree")[0]).toBe("svg (640.5x480.25)");
    expect(app.runLine("tree r")).toEqual(["rect#r x=1 y=2 w=3 h=4"]);
    expect(app.runLine("undo")).toEqual(["rect#r creation undone"]);
  });

  it("reports the required no-document error for every document-dependent command", () => {
    const app = new CliApp(new EditorSession(new SvgFileStore()));
    const commands = [
      "save",
      "canvas",
      "create g g1",
      "delete x",
      "move x 1 1",
      "scale x 2",
      "set x fill red",
      "group g1 x",
      "ungroup x",
      "addto g1 x",
      "front x",
      "back x",
      "tree",
      "show x",
      "undo",
      "redo"
    ];
    for (const command of commands) {
      expect(app.runLine(command), command).toEqual([
        "error: no document. use 'init' or 'read' first"
      ]);
    }
    expect(app.runLine("help")[0]).toBe("Commands:");
  });

  it("creates all six built-in types at the root and saves no implicit paint defaults", () => {
    const directory = mkdtempSync(join(tmpdir(), "sw-design-lab-acceptance-"));
    const path = join(directory, "root.svg");
    try {
      const app = new CliApp(new EditorSession(new SvgFileStore()));
      app.runLine("init 80 60");
      const commands = [
        "create rect r 1 2 3 4",
        "create circle c 5 6 7",
        "create ellipse e 8 9 10 11",
        "create line l 1 2 3 4",
        'create text t 10 20 "Hello"',
        "create g group"
      ];
      expect(commands.map((command) => app.runLine(command))).toEqual([
        ["rect#r created"],
        ["circle#c created"],
        ["ellipse#e created"],
        ["line#l created"],
        ["text#t created"],
        ["g#group created"]
      ]);
      expect(app.runLine(`save ${path}`)).toEqual([`saved to ${path} (6 elements)`]);
      const xml = readFileSync(path, "utf8");
      expect(xml).not.toMatch(/\s(?:fill|stroke|stroke-width)=/u);
      for (const tag of ["rect", "circle", "ellipse", "line", "text", "g"]) {
        expect(xml).toContain(`<${tag} `);
      }
      const restored = new SvgFileStore().read(path);
      expect(restored.document.tree().roots.map((shape) => [shape.label, shape.details])).toEqual([
        ["rect#r", "x=1 y=2 w=3 h=4"],
        ["circle#c", "cx=5 cy=6 r=7"],
        ["ellipse#e", "cx=8 cy=9 rx=10 ry=11"],
        ["line#l", "(1,2) -> (3,4)"],
        ["text#t", '(10,20) "Hello"'],
        ["g#group", ""]
      ]);
    } finally {
      if (existsSync(path)) unlinkSync(path);
      rmdirSync(directory);
    }
  });

  it("creates every built-in type through in inside a nested group", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create g outer");
    expect(app.runLine("create g inner in outer")).toEqual(["g#inner created in g#outer"]);
    const commands = [
      "create rect r 1 2 3 4 in inner",
      "create circle c 5 6 7 in inner",
      "create ellipse e 8 9 10 11 in inner",
      "create line l 1 2 3 4 in inner",
      'create text t 10 20 "Hello" in inner'
    ];
    expect(commands.map((command) => app.runLine(command))).toEqual([
      ["rect#r created in g#inner"],
      ["circle#c created in g#inner"],
      ["ellipse#e created in g#inner"],
      ["line#l created in g#inner"],
      ["text#t created in g#inner"]
    ]);
    expect(
      app
        .runLine("tree inner")
        .map((line) => line.match(/(?:g|rect|circle|ellipse|line|text)#[\w]+/u)?.[0])
    ).toEqual(["g#inner", "rect#r", "circle#c", "ellipse#e", "line#l", "text#t"]);
  });

  it("distinguishes case-sensitive ids and rejects invalid creation targets without state loss", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create g Node");
    app.runLine("create rect r 1 2 3 4");
    expect(app.runLine("create rect R 1 2 3 4")).toEqual(["rect#R created"]);
    const before = app.runLine("tree");
    expect(app.runLine("create rect r 1 2 3 4")).toEqual(["error: id already exists: r"]);
    expect(app.runLine("create hexagon h 1 2 3")).toEqual([
      "error: unknown shape type: hexagon (is the plugin loaded?)"
    ]);
    expect(app.runLine("create rect x 1 2 3 4 in absent")).toEqual([
      "error: no such container: absent"
    ]);
    expect(app.runLine("create rect x 1 2 3 4 in r")).toEqual(["error: not a container: r"]);
    expect(app.runLine("tree")).toEqual(before);
    expect(app.runLine("undo")).toEqual(["rect#R creation undone"]);
  });

  it("handles consecutive undo and redo, then clears stale redo after a new edit", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create g a");
    app.runLine("create g b");
    expect(app.runLine("undo")).toEqual(["g#b creation undone"]);
    expect(app.runLine("undo")).toEqual(["g#a creation undone"]);
    expect(app.runLine("redo")).toEqual(["g#a created"]);
    app.runLine("create g c");
    expect(app.runLine("redo")).toEqual(["error: nothing to redo"]);
    expect(app.runLine("tree")).toEqual(["svg (800x600)", "├── g#a", "└── g#c"]);
    expect(app.runLine("undo")).toEqual(["g#c creation undone"]);
  });

  it("keeps history and state when the future-stage box type is rejected", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create g existing");
    const before = app.runLine("tree");
    expect(app.runLine('create box n1 1 2 3 4 "Title"')).toEqual([
      "error: unknown shape type: box (is the plugin loaded?)"
    ]);
    expect(app.runLine("tree")).toEqual(before);
    expect(app.runLine("undo")).toEqual(["g#existing creation undone"]);
  });

  it("preserves tree, canvas and undo history for failures across command categories", () => {
    const directory = mkdtempSync(join(tmpdir(), "sw-design-lab-acceptance-"));
    try {
      const missingFile = join(directory, "missing.svg");
      const unwritable = join(directory, "missing-parent", "output.svg");
      const failures: readonly (readonly [string, string | undefined])[] = [
        ["init 0 10", undefined],
        [`read ${missingFile}`, `error: cannot read file: ${missingFile}`],
        [`save ${unwritable}`, `error: cannot write file: ${unwritable}`],
        ["canvas 0 10", undefined],
        ["create g parent", "error: id already exists: parent"],
        ["delete missing", "error: no such shape: missing"],
        ["move missing 1 1", "error: no such shape: missing"],
        ["scale child 0", "error: scale factor must be positive"],
        ["set child opacity 0.5", "error: unknown attribute: opacity"],
        [
          "group bad parent child",
          "error: cannot group a container into its own descendant: parent"
        ],
        ["ungroup parent", "error: cannot ungroup top-level container: parent"],
        ["addto missing child", "error: no such container: missing"],
        ["front missing", "error: no such shape: missing"],
        ["back missing", "error: no such shape: missing"],
        ["tree missing", "error: no such shape: missing"],
        ["show missing", "error: no such shape: missing"],
        ["help extra", undefined],
        ["undo extra", undefined],
        ["redo extra", undefined],
        ['create text x 1 2 "unclosed', undefined]
      ];
      for (const [command, exactError] of failures) {
        const app = new CliApp(new EditorSession(new SvgFileStore()));
        app.runLine("init 80 60");
        app.runLine("create g parent");
        app.runLine("create rect child 1 2 3 4 in parent");
        const tree = app.runLine("tree");
        const canvas = app.runLine("canvas");
        const output = app.runLine(command);
        expect(output, command).toHaveLength(1);
        expect(output[0], command).toMatch(/^error:/u);
        if (exactError !== undefined) expect(output, command).toEqual([exactError]);
        expect(app.runLine("tree"), command).toEqual(tree);
        expect(app.runLine("canvas"), command).toEqual(canvas);
        expect(app.runLine("undo"), command).toEqual(["rect#child creation undone"]);
      }
    } finally {
      rmdirSync(directory);
    }
  });

  it("keeps the actual read source and edit history after failed read and save", () => {
    const directory = mkdtempSync(join(tmpdir(), "sw-design-lab-acceptance-"));
    const source = join(directory, "source.svg");
    const unsupported = join(directory, "unsupported.svg");
    const unwritable = join(directory, "missing-parent", "output.svg");
    try {
      const app = new CliApp(new EditorSession(new SvgFileStore()));
      app.runLine("init 40 30");
      app.runLine("create rect base 0 0 1 1");
      expect(app.runLine(`save ${source}`)).toEqual([`saved to ${source} (1 elements)`]);
      expect(app.runLine(`read ${source}`)).toEqual([`read ${source} (1 elements)`]);
      app.runLine("create circle later 5 6 2");
      const before = app.runLine("tree");
      writeFileSync(
        unsupported,
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30" viewBox="0 0 40 30"><rect x="0" y="0" width="1" height="1"/><path id="x" d="M0 0"/></svg>',
        "utf8"
      );
      const readFailure = app.runLine(`read ${unsupported}`);
      expect(readFailure).toHaveLength(1);
      expect(readFailure[0]).toMatch(/^error:/u);
      expect(app.runLine(`save ${unwritable}`)).toEqual([
        `error: cannot write file: ${unwritable}`
      ]);
      expect(app.runLine("tree")).toEqual(before);
      expect(app.runLine("undo")).toEqual(["circle#later creation undone"]);
      expect(app.runLine("redo")).toEqual(["circle#later created"]);
      expect(app.runLine("save")).toEqual([`saved to ${source} (2 elements)`]);
      const reloaded = new SvgFileStore().read(source);
      expect(reloaded.count).toBe(2);
      expect(reloaded.document.tree().roots.map((shape) => shape.label)).toEqual([
        "rect#base",
        "circle#later"
      ]);
      expect(reloaded.document.tree("later").roots[0]?.details).toBe("cx=5 cy=6 r=2");
    } finally {
      if (existsSync(source)) unlinkSync(source);
      if (existsSync(unsupported)) unlinkSync(unsupported);
      rmdirSync(directory);
    }
  });

  it("does not discard an available redo entry after a failed edit", () => {
    const app = new CliApp(new EditorSession());
    app.runLine("init");
    app.runLine("create rect r 1 2 3 4");
    expect(app.runLine("undo")).toEqual(["rect#r creation undone"]);
    expect(app.runLine("create circle bad 0 0 Infinity")).toEqual([
      "error: invalid number: Infinity"
    ]);
    expect(app.runLine("tree")).toEqual(["svg (800x600)"]);
    expect(app.runLine("redo")).toEqual(["rect#r created"]);
  });
});
