import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("real REPL process", () => {
  it("prints the required banner and prompt while ignoring a comment", () => {
    const result = spawnSync(process.execPath, ["--import", "tsx", "src/main.ts"], {
      cwd: process.cwd(),
      input: "# ignored\ninit\n",
      encoding: "utf8",
      timeout: 10000
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^svg-editor 0\.1 — type 'help' for commands\n\nsvg> /u);
    expect(result.stdout).toContain("canvas 800x600 created");
    expect(result.stdout.match(/svg> /gu)).toHaveLength(3);
  });

  it("preserves UTF-8 text received through stdin", () => {
    const result = spawnSync(process.execPath, ["--import", "tsx", "src/main.ts"], {
      cwd: process.cwd(),
      input: 'init\ncreate text t1 20 40 "处理数据"\ntree\n',
      encoding: "utf8",
      timeout: 10000
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('text#t1        (20,40) "处理数据"');
  });
});
