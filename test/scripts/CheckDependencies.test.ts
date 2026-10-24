import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const checker = resolve("scripts/check-dependencies.mjs");

function checkFiles(files: Readonly<Record<string, string>>) {
  const directory = mkdtempSync(join(tmpdir(), "sw-design-dependencies-"));
  const sourceRoot = join(directory, "src");
  try {
    for (const [path, source] of Object.entries(files)) {
      const target = join(sourceRoot, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, source, "utf8");
    }
    return spawnSync(process.execPath, [checker, sourceRoot], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
  } finally {
    if (!directory.startsWith(`${tmpdir()}${sep}`)) {
      throw new Error("temporary dependency fixture escaped the system temp directory");
    }
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("dependency boundary checker", () => {
  it("accepts the client-owned type port and approved external APIs", () => {
    const result = checkFiles({
      "model/Shape.ts": "export class Shape {}",
      "editor/DocumentStore.ts": "export interface DocumentStore {}",
      "svg/SvgFileStore.ts": [
        'import type { DocumentStore } from "../editor/DocumentStore";',
        'import { Shape } from "../model/Shape";',
        'import { DOMParser } from "@xmldom/xmldom";',
        'import { readFileSync } from "node:fs";'
      ].join("\n"),
      "svg/AnotherAdapter.ts": 'import { type DocumentStore } from "../editor/DocumentStore";',
      "main.ts": 'import { createInterface } from "node:readline";'
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Dependency rules PASS");
  });

  it.each([
    ['import { EditorSession } from "../editor/EditorSession";', "editor/EditorSession"],
    ['import { DocumentStore } from "../editor/DocumentStore";', "type-only"],
    ['export type { DocumentStore } from "../editor/DocumentStore";', "type-only"]
  ])("rejects an SVG dependency outside the storage type port", (source, expected) => {
    const result = checkFiles({ "svg/Adapter.ts": source });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(expected);
  });

  it.each(["model", "editor", "cli"])("rejects third-party runtime packages in %s", (module) => {
    const result = checkFiles({
      [`${module}/Bad.ts`]: 'import { DOMParser } from "@xmldom/xmldom";'
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("@xmldom/xmldom");
  });

  it("rejects unapproved packages in the persistence module", () => {
    const result = checkFiles({
      "svg/Bad.ts": 'import value from "unapproved-package";'
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("unapproved-package");
  });

  it("rejects direct file access in the process entry point", () => {
    const result = checkFiles({ "main.ts": 'import { readFileSync } from "node:fs";' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("node:fs");
  });

  it("rejects a third-party package loaded through dynamic import", () => {
    const result = checkFiles({
      "model/Bad.ts": 'export async function load() { return import("@xmldom/xmldom"); }'
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("@xmldom/xmldom");
  });
});
