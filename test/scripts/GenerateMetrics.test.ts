import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";

describe("metrics generator", () => {
  it("derives categorized file, line and complexity evidence from Git refs", () => {
    const directory = mkdtempSync(join(tmpdir(), "sw-design-metrics-"));
    const output = join(directory, "metrics.md");
    try {
      const result = spawnSync(
        process.execPath,
        ["scripts/generate-metrics.mjs", "--base", "final", "--target", "HEAD", "--output", output],
        { encoding: "utf8" }
      );

      expect(result.status, result.stderr).toBe(0);
      const report = readFileSync(output, "utf8");
      expect(report).toContain("- 基线：`final`");
      expect(report).toContain("- 目标：`HEAD`");
      expect(report).toContain("| CLI 内核 |");
      expect(report).toContain("| 装配与技术支持 |");
      expect(report).toContain("| 内置及可选插件 |");
      expect(report).toContain("| VSCode 扩展（单列） |");
      expect(report).toContain("`src/main.ts`");
      expect(report).not.toContain("test/cli/");
    } finally {
      if (!directory.startsWith(`${tmpdir()}${sep}`)) {
        throw new Error("temporary metrics output escaped the system temp directory");
      }
      rmSync(directory, { recursive: true, force: true });
    }
  }, 15000);

  it("fails clearly instead of fabricating metrics for a missing target ref", () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/generate-metrics.mjs", "--target", "definitely-missing-metrics-ref"],
      { encoding: "utf8" }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("missing metrics ref: definitely-missing-metrics-ref");
  });
});
