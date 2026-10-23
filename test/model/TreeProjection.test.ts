import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";
import { createFromCommand } from "../support/createFromCommand";

describe("tree projection", () => {
  it("returns geometry facts rather than CLI-formatted detail text", () => {
    const document = new SvgDocument(100, 100);
    createFromCommand(document, "rect", "r", ["1", "2", "3", "4", "red"]);
    createFromCommand(document, "line", "l", ["1", "2", "3", "4"]);
    createFromCommand(document, "text", "t", ["5", "6", "hello"]);

    expect(document.tree().roots.map((shape) => shape.details)).toEqual([
      [
        { kind: "attribute", name: "x", value: "1" },
        { kind: "attribute", name: "y", value: "2" },
        { kind: "attribute", name: "width", value: "3" },
        { kind: "attribute", name: "height", value: "4" },
        { kind: "attribute", name: "fill", value: "red" }
      ],
      [{ kind: "segment", from: { x: "1", y: "2" }, to: { x: "3", y: "4" } }],
      [{ kind: "positionedText", position: { x: "5", y: "6" }, text: "hello" }]
    ]);
  });
});
