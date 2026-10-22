import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("real REPL process", () => {
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
