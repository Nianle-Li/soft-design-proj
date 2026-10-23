import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";
import { createFromCommand } from "../support/createFromCommand";
import { SvgFileStore } from "../../src/svg/SvgFileStore";

describe("SVG file adapter", () => {
  it("writes a browser-readable file and reads it back with nested order intact", () => {
    const directory = mkdtempSync(join(tmpdir(), "sw-design-lab-svg-"));
    const path = join(directory, "drawing.svg");
    try {
      const document = new SvgDocument(200, 100);
      createFromCommand(document, "g", "layer", []);
      createFromCommand(document, "line", "edge", ["1", "2", "3", "4", "red"], "layer");
      createFromCommand(document, "text", "name", ["5", "6", "A&B"], "layer");
      const store = new SvgFileStore();
      expect(store.write(path, document)).toBe(3);
      const saved = readFileSync(path, "utf8");
      expect(saved).toContain('viewBox="0 0 200 100"');
      expect(saved).toContain("A&amp;B");
      const loaded = store.read(path);
      expect(loaded.count).toBe(3);
      expect(loaded.document.tree()).toEqual(document.tree());
      expect(loaded.document.explicitStyle("edge")).toEqual({ stroke: "red" });
      createFromCommand(document, "circle", "later", ["10", "10", "2"]);
      expect(store.write(path, document)).toBe(4);
      expect(store.read(path).document.tree().roots.at(-1)?.label).toBe("circle#later");
    } finally {
      if (existsSync(path)) unlinkSync(path);
      rmdirSync(directory);
    }
  });

  it("keeps an existing file intact when serialization fails", () => {
    const directory = mkdtempSync(join(tmpdir(), "sw-design-lab-svg-"));
    const path = join(directory, "drawing.svg");
    try {
      writeFileSync(path, "original", "utf8");
      const document = new SvgDocument(20, 10);
      createFromCommand(document, "text", "bad", ["0", "0", "bad\u0000text"]);
      expect(() => new SvgFileStore().write(path, document)).toThrow(`cannot write file: ${path}`);
      expect(readFileSync(path, "utf8")).toBe("original");
      expect(readdirSync(directory)).toEqual(["drawing.svg"]);
    } finally {
      if (existsSync(path)) unlinkSync(path);
      rmdirSync(directory);
    }
  });

  it("removes its own temporary file when replacing the destination fails", () => {
    const directory = mkdtempSync(join(tmpdir(), "sw-design-lab-svg-"));
    const destination = join(directory, "directory.svg");
    mkdirSync(destination);
    try {
      const document = new SvgDocument(20, 10);
      expect(() => new SvgFileStore().write(destination, document)).toThrow(
        `cannot write file: ${destination}`
      );
      expect(readdirSync(directory)).toEqual(["directory.svg"]);
    } finally {
      rmdirSync(destination);
      rmdirSync(directory);
    }
  });
});
