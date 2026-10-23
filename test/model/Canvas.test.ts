import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";
import { createFromCommand } from "../support/createFromCommand";

describe("SvgDocument canvas dimensions", () => {
  it("changes only the dimensions and preserves the shape tree", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "rect", "r1", ["1", "2", "3", "4"]);
    const before = document.tree().roots;

    expect(document.resizeCanvas(400.5, 300)).toEqual({ width: 400.5, height: 300 });
    expect(document.tree()).toEqual({ width: 400.5, height: 300, roots: before });
  });

  it("rejects invalid dimensions before changing either dimension", () => {
    const document = new SvgDocument(800, 600);
    for (const [width, height] of [
      [0, 300],
      [400, -1],
      [Number.NaN, 300],
      [400, Infinity]
    ] as const) {
      expect(() => document.resizeCanvas(width, height)).toThrow(
        "canvas dimensions must be positive finite numbers"
      );
      expect(document.canvasSize()).toEqual({ width: 800, height: 600 });
    }
  });
});
