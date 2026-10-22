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

describe("read/save CLI", () => {
  it("round-trips through temporary files without changing the read source on explicit save", () => {
    const directory = mkdtempSync(join(tmpdir(), "sw-design-lab-svg-"));
    const source = join(directory, "source.svg");
    const copy = join(directory, "copy.svg");
    try {
      const app = new CliApp(new EditorSession(new SvgFileStore()));
      expect(app.runLine("init 40 30")).toEqual(["canvas 40x30 created"]);
      expect(app.runLine("create rect r 1 2 3 4")).toEqual(["rect#r created"]);
      expect(app.runLine(`save ${source}`)).toEqual([`saved to ${source} (1 elements)`]);
      expect(app.runLine("save")).toEqual(["error: no read path for save"]);
      expect(app.runLine(`read ${source}`)).toEqual([`read ${source} (1 elements)`]);
      expect(app.runLine("create circle c 5 6 7")).toEqual(["circle#c created"]);
      expect(app.runLine(`save ${copy}`)).toEqual([`saved to ${copy} (2 elements)`]);
      expect(app.runLine("save")).toEqual([`saved to ${source} (2 elements)`]);
      expect(readFileSync(source, "utf8")).toBe(readFileSync(copy, "utf8"));
    } finally {
      if (existsSync(source)) unlinkSync(source);
      if (existsSync(copy)) unlinkSync(copy);
      rmdirSync(directory);
    }
  });

  it("prints the assignment warning, count and strict path error", () => {
    const app = new CliApp(new EditorSession(new SvgFileStore()));
    expect(app.runLine("init")).toEqual(["canvas 800x600 created"]);
    expect(app.runLine("save")).toEqual(["error: no read path for save"]);
    const source = "test/fixtures/svg/other.svg";
    expect(app.runLine(`read ${source}`)).toEqual([
      "warning: assigned id rect1 to unnamed <rect>",
      `read ${source} (7 elements)`
    ]);
    expect(app.runLine("undo")).toEqual(["error: undo not allowed after io command"]);
    expect(app.runLine("read missing-file.svg")).toEqual([
      "error: cannot read file: missing-file.svg"
    ]);
    expect(app.runLine("tree")).toEqual([
      "svg (400x300)",
      "├── rect#rect1     x=0 y=0 w=400 h=300 fill=#ffffff",
      '├── text#t1        (10,290) "imported"',
      "├── circle#c1      cx=50 cy=50 r=10",
      "├── g#g1",
      "│   ├── rect#r2    x=0 y=0 w=10 h=10",
      "│   └── circle#c2  cx=5 cy=5 r=2",
      "└── ellipse#e1     cx=1 cy=2 rx=3 ry=4"
    ]);
  });

  it("does not emit provisional id warnings or disturb history when a later element is unsupported", () => {
    const directory = mkdtempSync(join(tmpdir(), "sw-design-lab-svg-"));
    const path = join(directory, "unsupported.svg");
    try {
      writeFileSync(
        path,
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30" viewBox="0 0 40 30"><rect x="0" y="0" width="1" height="1"/><g id="bad" transform="scale(2)"/></svg>',
        "utf8"
      );
      const app = new CliApp(new EditorSession(new SvgFileStore()));
      app.runLine("init");
      app.runLine("create rect old 0 0 1 1");
      expect(app.runLine(`read ${path}`)).toEqual([
        "error: unsupported SVG attribute: transform on <g>"
      ]);
      expect(app.runLine("tree")[1]).toContain("rect#old");
      expect(app.runLine("undo")).toEqual(["rect#old creation undone"]);
    } finally {
      unlinkSync(path);
      rmdirSync(directory);
    }
  });
});
