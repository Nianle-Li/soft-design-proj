import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const fixtures = resolve("test/fixtures/final-baseline");
const tsxLoader = pathToFileURL(createRequire(resolve("package.json")).resolve("tsx")).href;

describe("Phase 1 final byte baseline", () => {
  it.each([
    ["reference", "demo.svg"],
    ["flowchart", "flowchart.svg"]
  ])("preserves %s stdout and saved SVG bytes", (session, savedName) => {
    const directory = mkdtempSync(join(tmpdir(), "sw-design-lab-final-"));
    try {
      copyFileSync(resolve("test/fixtures/svg/other.svg"), join(directory, "other.svg"));
      const result = spawnSync(process.execPath, ["--import", tsxLoader, resolve("src/main.ts")], {
        cwd: directory,
        input: readFileSync(join(fixtures, `${session}.stdin.txt`)),
        timeout: 10000
      });

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(result.stderr).toEqual(Buffer.alloc(0));
      expect(result.stdout).toEqual(readFileSync(join(fixtures, `${session}.stdout.txt`)));
      expect(readFileSync(join(directory, savedName))).toEqual(
        readFileSync(join(fixtures, savedName))
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
