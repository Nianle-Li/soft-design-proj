import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import boxPlugin, { boxManifest } from "../../plugins/box";
import dirPlugin, { dirManifest } from "../../plugins/dir";
import modifiedStarPlugin, { modifiedStarManifest } from "../../plugins/modified-star";
import statsPlugin, { statsManifest } from "../../plugins/stats";
import {
  createCodeApplication,
  createConfiguredApplication
} from "../../src/host/assembly/ApplicationAssembly";

const projectRoot = process.cwd();
const entry = resolve("src/main.ts");
const tsxLoader = pathToFileURL(createRequire(resolve("package.json")).resolve("tsx")).href;

function run(directory: string, input: string, configPath?: string) {
  const arguments_ = ["--import", tsxLoader, entry];
  if (configPath !== undefined) arguments_.push("--config", configPath);
  return spawnSync(process.execPath, arguments_, {
    cwd: directory,
    input,
    encoding: "utf8",
    timeout: 10000
  });
}

describe("code and configuration assembly equivalence", () => {
  it("produces the same tree state for the complete plugin set", async () => {
    const directory = mkdtempSync(join(tmpdir(), "sw-design-complete-assembly-"));
    const configPath = join(directory, "plugins.config.json");
    const savedPath = join(directory, "saved.svg");
    try {
      writeFileSync(
        configPath,
        JSON.stringify({
          plugins: [
            { module: resolve(projectRoot, "plugins/box/index.ts") },
            { module: resolve(projectRoot, "plugins/modified-star/index.ts") },
            { module: resolve(projectRoot, "plugins/stats/index.ts") },
            { module: resolve(projectRoot, "plugins/dir/index.ts") }
          ]
        }),
        "utf8"
      );
      const code = createCodeApplication([
        { ...boxManifest, plugin: boxPlugin },
        { ...modifiedStarManifest, plugin: modifiedStarPlugin },
        { ...statsManifest, plugin: statsPlugin },
        { ...dirManifest, plugin: dirPlugin }
      ]);
      const configured = await createConfiguredApplication(configPath);
      expect(configured.errors).toEqual([]);

      const input = [
        "init 200 100",
        'create box n1 10 20 100 40 "Title"',
        "tree",
        `save ${savedPath}`,
        "tree",
        "set n1 fill #f5a623",
        "tree",
        "undo",
        "tree",
        "redo",
        "tree"
      ];
      expect(input.map((line) => configured.app.runLine(line))).toEqual(
        input.map((line) => code.runLine(line))
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it.each([
    [
      "Phase 1 reference",
      readFileSync(resolve("test/fixtures/final-baseline/reference.stdin.txt"), "utf8")
    ],
    [
      "Phase 1 flowchart",
      readFileSync(resolve("test/fixtures/final-baseline/flowchart.stdin.txt"), "utf8")
    ],
    [
      "box editing",
      'init 200 100\ncreate box n1 10 20 100 40 "Title"\nset n1 fill #f5a623\nset n1 label "Title v2"\nmove n1 5 6\nundo\nredo\nstats\ntree\n'
    ],
    ["commands", "init\nstats\ndir\nhelp\n"]
  ])("produces byte-identical output for %s", (_name, input) => {
    const directory = mkdtempSync(join(tmpdir(), "sw-design-dual-assembly-"));
    const configPath = join(directory, "plugins.config.json");
    try {
      mkdirSync(join(directory, ".hidden"));
      mkdirSync(join(directory, "docs"));
      writeFileSync(join(directory, ".env"), "fixed", "utf8");
      copyFileSync(resolve("test/fixtures/svg/other.svg"), join(directory, "other.svg"));
      writeFileSync(
        configPath,
        JSON.stringify({
          plugins: [
            { module: resolve(projectRoot, "plugins/box/index.ts") },
            { module: resolve(projectRoot, "plugins/stats/index.ts") },
            { module: resolve(projectRoot, "plugins/dir/index.ts") }
          ]
        }),
        "utf8"
      );

      const code = run(directory, input);
      const configured = run(directory, input, configPath);

      expect(code.error).toBeUndefined();
      expect(configured.error).toBeUndefined();
      expect(code.status).toBe(0);
      expect(configured.status).toBe(0);
      expect(code.stderr).toBe("");
      expect(configured.stderr).toBe("");
      expect(configured.stdout).toBe(code.stdout);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
