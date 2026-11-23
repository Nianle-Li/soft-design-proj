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
    mkdirSync(sourceRoot, { recursive: true });
    for (const [path, source] of Object.entries(files)) {
      const target = path.startsWith("plugins/") ? join(directory, path) : join(sourceRoot, path);
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

  it.each(["model", "editor", "host/cli"])(
    "rejects third-party runtime packages in %s",
    (module) => {
      const result = checkFiles({
        [`${module}/Bad.ts`]: 'import { DOMParser } from "@xmldom/xmldom";'
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("@xmldom/xmldom");
    }
  );

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

  it("accepts B+ imports through the public plugin API and the SVG storage port", () => {
    const result = checkFiles({
      "core/model/Shape.ts": "export class Shape {}",
      "core/editor/DocumentStore.ts": "export interface DocumentStore {}",
      "core/command/Command.ts": 'import type { Shape } from "../model/Shape";',
      "core/tree/TreeDecorator.ts": 'import type { Shape } from "../model/Shape";',
      "core/plugin-api.ts": 'export { Shape } from "./model/Shape";',
      "host/cli/CliApp.ts": 'import { Shape } from "../../core/model/Shape";',
      "main.ts": 'import { CliApp } from "./host/cli/CliApp";',
      "host/assembly/CodePlugins.ts": 'import { Box } from "../../../plugins/box/Box";',
      "host/assembly/PluginLoader.ts":
        "export async function load(path: string) { return import(path); }",
      "adapters/svg/SvgFileStore.ts": [
        'import type { DocumentStore } from "../../core/editor/DocumentStore";',
        'import { Shape } from "../../core/model/Shape";',
        'import { DOMParser } from "@xmldom/xmldom";',
        'import { readFileSync } from "node:fs";'
      ].join("\n"),
      "builtin/shapes/Rect.ts": 'import { Shape } from "../../core/plugin-api";',
      "plugins/box/Box.ts": [
        'import { Shape } from "../../src/core/plugin-api";',
        'import { helper } from "./helper";',
        "export class Box extends Shape { value = helper; }"
      ].join("\n"),
      "plugins/box/helper.ts": "export const helper = 1;",
      "plugins/dir/adapters/NodeDirectoryReader.ts": 'import { readdirSync } from "node:fs";'
    });
    expect(result.status, result.stderr).toBe(0);
  });

  it.each([
    ["core/model/Bad.ts", 'import "../../host/cli/CliApp";', "core/model -> host/cli"],
    [
      "core/editor/Bad.ts",
      'import "../../adapters/svg/SvgFileStore";',
      "core/editor -> adapters/svg"
    ],
    [
      "core/command/Bad.ts",
      'import "../../builtin/shapes/Rect";',
      "core/command -> builtin/shapes"
    ],
    ["core/tree/Bad.ts", 'import "../../../plugins/box/Box";', "core/tree -> plugins/box"],
    ["host/cli/Bad.ts", 'import "../../../plugins/box/Box";', "host/cli -> plugins/box"],
    ["adapters/svg/Bad.ts", 'import "../../host/cli/CliApp";', "adapters/svg -> host/cli"],
    ["builtin/shapes/Bad.ts", 'import "../../core/model/Shape";', "builtin/shapes -> core/model"]
  ])("rejects forbidden B+ direction from %s", (file, source, expected) => {
    const result = checkFiles({ [file]: source });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(expected);
  });

  it.each([
    ['import { Shape } from "../../src/core/model/Shape";', "plugins/box -> core/model"],
    ['import "../../src/host/assembly/CodePlugins";', "plugins/box -> host/assembly"],
    ['import "../stats/Stats";', "plugins/box -> plugins/stats"]
  ])("keeps a plugin inside its package and the public API", (source, expected) => {
    const result = checkFiles({ "plugins/box/Bad.ts": source });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(expected);
  });

  it("keeps Node file access in a plugin-owned adapter", () => {
    const result = checkFiles({
      "plugins/dir/DirCommand.ts": 'import { readdirSync } from "node:fs";'
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("node:fs");
  });

  it("does not let an unprefixed Node import bypass the adapter rule", () => {
    const result = checkFiles({
      "plugins/dir/package.json": JSON.stringify({ dependencies: { fs: "*" } }),
      "plugins/dir/DirCommand.ts": 'import { readdirSync } from "fs";'
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Node API fs is not allowed");
  });

  it.each([
    ['import { DocumentStore } from "../../core/editor/DocumentStore";', "type-only"],
    ['import type { EditorSession } from "../../core/editor/EditorSession";', "DocumentStore"]
  ])("restricts the SVG adapter's editor dependency", (source, expected) => {
    const result = checkFiles({ "adapters/svg/Bad.ts": source });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(expected);
  });

  it.each(["host/cli/Bad.ts", "core/model/Bad.ts", "plugins/box/Bad.ts"])(
    "rejects a nonliteral dynamic import outside PluginLoader.ts: %s",
    (file) => {
      const result = checkFiles({
        [file]: "export async function load(path: string) { return import(path); }"
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("dynamic module path cannot be checked");
    }
  );

  it("does not let PluginLoader.ts hard-code a plugin import", () => {
    const result = checkFiles({
      "host/assembly/PluginLoader.ts": 'import { Box } from "../../../plugins/box/Box";'
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("loader cannot import a concrete plugin");
  });

  it("allows a plugin's declared runtime package without editing the checker", () => {
    const result = checkFiles({
      "plugins/box/package.json": JSON.stringify({ dependencies: { "@example/helper": "1.0.0" } }),
      "plugins/box/Box.ts": 'import value from "@example/helper/subpath"; export { value };'
    });
    expect(result.status).toBe(0);
  });

  it("rejects an undeclared package dependency inside a plugin", () => {
    const result = checkFiles({
      "plugins/box/package.json": JSON.stringify({ dependencies: {} }),
      "plugins/box/Box.ts": 'import value from "@example/helper"; export { value };'
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("undeclared plugin package @example/helper");
  });

  it("rejects source files in an unrecognized B+ module", () => {
    const result = checkFiles({ "framework/Bad.ts": "export const bad = true;" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("unknown source module");
  });

  it("rejects the retired Phase 1 CLI directory", () => {
    const result = checkFiles({ "cli/Bad.ts": "export const bad = true;" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("unknown source module");
  });
});
