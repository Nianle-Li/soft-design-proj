import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";

describe("shape inspection", () => {
  it("returns detached geometry, explicit styles and parent without traversing children", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "markers", []);
    document.create("circle", "c1", ["100", "100", "20", "red"], "markers");
    document.set("c1", "stroke-width", "1.5");
    document.create("text", "caption", ["20", "40", "Hello"], "markers");
    document.set("caption", "stroke", "blue");

    expect(document.show("c1")).toEqual({
      label: "circle#c1",
      parentLabel: "g#markers",
      geometry: [
        ["cx", "100"],
        ["cy", "100"],
        ["r", "20"]
      ],
      style: { fill: "red", strokeWidth: "1.5" }
    });
    expect(document.show("caption")).toEqual({
      label: "text#caption",
      parentLabel: "g#markers",
      geometry: [
        ["x", "20"],
        ["y", "40"]
      ],
      style: { stroke: "blue" },
      text: "Hello"
    });
    expect(document.show("markers")).toEqual({
      label: "g#markers",
      parentLabel: "svg",
      geometry: [],
      style: {}
    });
    expect(() => document.show("missing")).toThrow("no such shape: missing");
  });

  it("reports the remaining built-in geometry from the same shape projection used by SVG output", () => {
    const document = new SvgDocument(80, 60);
    document.create("rect", "r", ["1", "2", "3", "4"]);
    document.create("ellipse", "e", ["5", "6", "7", "8"]);
    document.create("line", "l", ["9", "10", "11", "12"]);
    expect(document.show("r").geometry).toEqual([
      ["x", "1"],
      ["y", "2"],
      ["width", "3"],
      ["height", "4"]
    ]);
    expect(document.show("e").geometry).toEqual([
      ["cx", "5"],
      ["cy", "6"],
      ["rx", "7"],
      ["ry", "8"]
    ]);
    expect(document.show("l").geometry).toEqual([
      ["x1", "9"],
      ["y1", "10"],
      ["x2", "11"],
      ["y2", "12"]
    ]);
  });
});
