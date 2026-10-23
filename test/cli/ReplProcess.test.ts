import { spawnSync } from "node:child_process";
import {
  existsSync,
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmdirSync,
  unlinkSync
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DOMParser } from "@xmldom/xmldom";
import { describe, expect, it } from "vitest";

function goldenSteps(
  filename: string
): readonly Readonly<{ command: string; output: readonly string[] }>[] {
  const lines = readFileSync(resolve("test/fixtures/transcripts", filename), "utf8").split(
    /\r?\n/u
  );
  const steps: { command: string; output: string[] }[] = [];
  for (const line of lines) {
    if (line.startsWith("svg> ")) {
      steps.push({ command: line.slice(5), output: [] });
    } else if (
      line !== "" &&
      !line.startsWith("$") &&
      !line.startsWith("#") &&
      !line.startsWith("svg-editor ")
    ) {
      steps.at(-1)?.output.push(line);
    }
  }
  return steps;
}

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

  it.each([
    ["phase1-reference.golden.txt", "demo.svg", 5],
    ["phase1-flowchart.golden.txt", "flowchart.svg", 8]
  ])(
    "replays %s through the real process and checks its saved SVG",
    (filename, outputName, count) => {
      const directory = mkdtempSync(join(tmpdir(), "sw-design-lab-repl-"));
      const inputFile = join(directory, "other.svg");
      const outputFile = join(directory, outputName);
      try {
        copyFileSync(resolve("test/fixtures/svg/other.svg"), inputFile);
        const steps = goldenSteps(filename);
        const expected =
          "svg-editor 0.1 — type 'help' for commands\n\n" +
          steps.map(({ output }) => `svg> ${output.map((line) => `${line}\n`).join("")}`).join("") +
          "svg> ";
        const tsxLoader = pathToFileURL(createRequire(resolve("package.json")).resolve("tsx")).href;
        const result = spawnSync(
          process.execPath,
          ["--import", tsxLoader, resolve("src/main.ts")],
          {
            cwd: directory,
            input: `${steps.map(({ command }) => command).join("\n")}\n`,
            encoding: "utf8",
            timeout: 10000
          }
        );

        expect(result.error).toBeUndefined();
        expect(result.status).toBe(0);
        expect(result.stderr).toBe("");
        expect(result.stdout).toBe(expected);

        const saved = readFileSync(outputFile, "utf8");
        const parsed = new DOMParser({
          onError: (_level, message) => {
            throw new Error(message);
          }
        }).parseFromString(saved, "image/svg+xml");
        expect(parsed.documentElement?.namespaceURI).toBe("http://www.w3.org/2000/svg");
        expect(parsed.getElementsByTagName("*").length - 1).toBe(count);
        if (outputName === "demo.svg") {
          expect(parsed.getElementsByTagName("text").item(0)?.textContent).toBe("My Diagram");
          expect(parsed.getElementsByTagName("g").item(0)?.childNodes.length).toBe(2);
        } else {
          expect(parsed.getElementsByTagName("text").item(1)?.textContent).toBe("处理数据 v2");
          expect(parsed.getElementsByTagName("g").length).toBe(3);
        }
      } finally {
        if (existsSync(outputFile)) unlinkSync(outputFile);
        if (existsSync(inputFile)) unlinkSync(inputFile);
        rmdirSync(directory);
      }
    }
  );
});
