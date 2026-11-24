import { describe, expect, it } from "vitest";
import type { DirectoryEntry, DirectoryReader } from "../../plugins/dir/DirectoryReader";
import { DirCommand } from "../../plugins/dir/DirCommand";
import { CliApp } from "../../src/host/cli/CliApp";
import { createDefaultEditorSession } from "../support/createDefaultEditorSession";

class FakeDirectoryReader implements DirectoryReader {
  fail = false;

  constructor(
    readonly path: string,
    readonly items: readonly DirectoryEntry[]
  ) {}

  currentPath(): string {
    return this.path;
  }

  read(path: string): readonly DirectoryEntry[] {
    expect(path).toBe(this.path);
    if (this.fail) throw new Error("platform detail");
    return this.items;
  }
}

describe("dir command", () => {
  it("lists directories before files, sorts each group, keeps hidden names and ignores special items", () => {
    const reader = new FakeDirectoryReader("/work", [
      { name: "z.svg", kind: "file" },
      { name: ".cache", kind: "directory" },
      { name: "docs", kind: "directory" },
      { name: ".env", kind: "file" },
      { name: "link", kind: "other" },
      { name: "..", kind: "directory" },
      { name: ".", kind: "directory" }
    ]);

    expect(new DirCommand(reader).execute([])).toEqual([
      "[DIR]  .cache",
      "[DIR]  docs",
      "[FILE]  .env",
      "[FILE]  z.svg"
    ]);
  });

  it("reports an empty directory and rejects arguments", () => {
    const command = new DirCommand(new FakeDirectoryReader("/empty", []));
    expect(command.execute([])).toEqual(["(empty directory)"]);
    expect(() => command.execute(["extra"])).toThrow("usage: dir");
  });

  it("reports the target path on read failure and remains usable afterwards", () => {
    const reader = new FakeDirectoryReader("/denied", [{ name: "a", kind: "file" }]);
    const command = new DirCommand(reader);
    reader.fail = true;
    expect(() => command.execute([])).toThrow("cannot read directory: /denied");
    reader.fail = false;
    expect(command.execute([])).toEqual(["[FILE]  a"]);
  });

  it("runs without a document and does not disturb redo history", () => {
    const reader = new FakeDirectoryReader("/work", [{ name: "a", kind: "file" }]);
    const app = new CliApp(createDefaultEditorSession(), [new DirCommand(reader)]);
    expect(app.runLine("dir")).toEqual(["[FILE]  a"]);
    app.runLine("init");
    app.runLine("create rect r 0 0 1 1");
    app.runLine("undo");
    reader.fail = true;
    expect(app.runLine("dir")).toEqual(["error: cannot read directory: /work"]);
    reader.fail = false;
    expect(app.runLine("dir")).toEqual(["[FILE]  a"]);
    expect(app.runLine("redo")).toEqual(["rect#r created"]);
    expect(app.runLine("help").at(-1)).toBe("  dir");
    expect(new CliApp(createDefaultEditorSession()).runLine("dir")).toEqual([
      "error: unknown command: dir"
    ]);
  });
});
