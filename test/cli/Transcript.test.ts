import { existsSync, mkdtempSync, readFileSync, rmdirSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CliApp } from "../../src/cli/CliApp";
import type { DocumentStore } from "../../src/editor/DocumentStore";
import { EditorSession } from "../../src/editor/EditorSession";
import type { SvgDocument } from "../../src/model/SvgDocument";
import { SvgFileStore } from "../../src/svg/SvgFileStore";

class TranscriptStore implements DocumentStore {
  private readonly delegate = new SvgFileStore();

  constructor(private readonly directory: string) {}

  read(path: string) {
    return this.delegate.read(
      path === "other.svg" ? resolve("test/fixtures/svg/other.svg") : join(this.directory, path)
    );
  }

  write(path: string, document: SvgDocument): number {
    return this.delegate.write(join(this.directory, path), document);
  }
}

interface Step {
  readonly command: string;
  readonly expected: readonly string[];
}

function stepsFromGolden(filename: string): Step[] {
  const lines = readFileSync(resolve("test/fixtures/transcripts", filename), "utf8").split(
    /\r?\n/u
  );
  const steps: { command: string; expected: string[] }[] = [];
  for (const line of lines) {
    if (line.startsWith("svg> ")) {
      steps.push({ command: line.slice(5), expected: [] });
    } else if (
      line !== "" &&
      !line.startsWith("$") &&
      !line.startsWith("#") &&
      !line.startsWith("svg-editor ")
    ) {
      steps.at(-1)?.expected.push(line);
    }
  }
  return steps;
}

describe("assignment transcripts", () => {
  it.each([
    ["phase1-reference.golden.txt", "demo.svg"],
    ["phase1-flowchart.golden.txt", "flowchart.svg"]
  ])("replays %s against the original expected output", (filename, outputName) => {
    const directory = mkdtempSync(join(tmpdir(), "sw-design-lab-transcript-"));
    const outputPath = join(directory, outputName);
    try {
      const app = new CliApp(new EditorSession(new TranscriptStore(directory)));
      const mismatches: string[] = [];
      for (const { command, expected } of stepsFromGolden(filename)) {
        const actual = app.runLine(command);
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          mismatches.push(
            `${command}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
          );
        }
      }
      expect(mismatches).toEqual([]);
      expect(existsSync(outputPath)).toBe(true);
    } finally {
      if (existsSync(outputPath)) unlinkSync(outputPath);
      rmdirSync(directory);
    }
  });
});
