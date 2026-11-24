import { describe, expect, it } from "vitest";
import { createDefaultDocument } from "../support/createDefaultDocument";
import { createFromCommand } from "../support/createFromCommand";

describe("tree projection", () => {
  it("exposes semantic type and container facts independently of display labels", () => {
    const document = createDefaultDocument(100, 100);
    createFromCommand(document, "g", "empty", []);
    createFromCommand(document, "g", "outer", []);
    createFromCommand(document, "rect", "child", ["0", "0", "1", "1"], "outer");

    const [empty, outer] = document.tree().roots;
    expect(empty).toMatchObject({ kind: "g", isContainer: true, children: [] });
    expect(outer).toMatchObject({ kind: "g", isContainer: true });
    expect(outer?.children[0]).toMatchObject({ kind: "rect", isContainer: false });
  });

  it("returns geometry facts rather than CLI-formatted detail text", () => {
    const document = createDefaultDocument(100, 100);
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
