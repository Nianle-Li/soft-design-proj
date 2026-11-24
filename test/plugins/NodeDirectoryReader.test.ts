import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NodeDirectoryReader } from "../../plugins/dir/adapters/NodeDirectoryReader";
import { DirCommand } from "../../plugins/dir/DirCommand";
import { CliApp } from "../../src/host/cli/CliApp";
import { createDefaultEditorSession } from "../support/createDefaultEditorSession";

describe("Node directory reader", () => {
  it("maps a real directory without changing the process working directory", () => {
    const directory = mkdtempSync(join(tmpdir(), "sw-design-lab-dir-adapter-"));
    const original = process.cwd();
    try {
      mkdirSync(join(directory, ".cache"));
      mkdirSync(join(directory, "docs"));
      writeFileSync(join(directory, ".env"), "hidden");
      writeFileSync(join(directory, "demo.svg"), "<svg/>");
      const reader = new NodeDirectoryReader(() => directory);

      expect(reader.currentPath()).toBe(directory);
      expect(reader.read(directory)).toEqual(
        expect.arrayContaining([
          { name: ".cache", kind: "directory" },
          { name: "docs", kind: "directory" },
          { name: ".env", kind: "file" },
          { name: "demo.svg", kind: "file" }
        ])
      );
      expect(process.cwd()).toBe(original);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("preserves read failures for the command to translate", () => {
    const path = join(tmpdir(), `sw-design-lab-missing-${String(process.pid)}`);
    const app = new CliApp(createDefaultEditorSession(), [
      new DirCommand(new NodeDirectoryReader(() => path))
    ]);
    expect(app.runLine("dir")).toEqual([`error: cannot read directory: ${path}`]);
    expect(app.runLine("help").at(-1)).toBe("  dir");
  });
});
