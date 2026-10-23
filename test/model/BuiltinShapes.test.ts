import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";
import { createFromCommand } from "../support/createFromCommand";

describe("all Phase 1 built-in shapes", () => {
  it("creates circle, ellipse, line and text with their own geometry", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "circle", "c1", ["100", "120", "20", "red"]);
    createFromCommand(document, "ellipse", "e1", ["1.5", "2", "3", "4"]);
    createFromCommand(document, "line", "l1", ["0", "10", "30", "40", "black"]);
    createFromCommand(document, "text", "t1", ["20", "40", "My Diagram"]);

    expect(document.tree().roots.map((shape) => shape.label)).toEqual([
      "circle#c1",
      "ellipse#e1",
      "line#l1",
      "text#t1"
    ]);
    expect(document.show("c1")).toMatchObject({
      geometry: [
        ["cx", "100"],
        ["cy", "120"],
        ["r", "20"]
      ],
      style: { fill: "red" }
    });
    expect(document.show("e1").geometry).toEqual([
      ["cx", "1.5"],
      ["cy", "2"],
      ["rx", "3"],
      ["ry", "4"]
    ]);
    expect(document.show("l1")).toMatchObject({
      geometry: [
        ["x1", "0"],
        ["y1", "10"],
        ["x2", "30"],
        ["y2", "40"]
      ],
      style: { stroke: "black" }
    });
    expect(document.show("t1")).toMatchObject({
      geometry: [
        ["x", "20"],
        ["y", "40"]
      ],
      text: "My Diagram"
    });
  });

  it("rejects missing, extra and non-finite arguments before changing the document", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "g", "parent", []);
    const before = document.tree();

    expect(() => createFromCommand(document, "circle", "c1", ["1", "2"], "parent")).toThrow(
      "invalid arguments for circle"
    );
    expect(() =>
      createFromCommand(document, "ellipse", "e1", ["1", "2", "NaN", "4"], "parent")
    ).toThrow("invalid number: NaN");
    expect(() =>
      createFromCommand(document, "line", "l1", ["1", "2", "3", "4", "black", "extra"])
    ).toThrow("invalid arguments for line");
    expect(() => createFromCommand(document, "text", "t1", ["1", "2"])).toThrow(
      "invalid arguments for text"
    );
    expect(document.tree()).toEqual(before);

    createFromCommand(document, "circle", "c1", ["1", "2", "3"], "parent");
    expect(document.tree("parent").roots[0]?.children).toHaveLength(1);
  });

  it("preserves optional fill only when supplied", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "circle", "plain", ["1", "2", "3"]);
    createFromCommand(document, "ellipse", "colored", ["4", "5", "6", "7", "#abc"]);

    expect(document.show("plain").style).toEqual({});
    expect(document.show("colored").style).toEqual({ fill: "#abc" });
  });

  it.each([
    ["rect", ["0", "0", "-1", "10"], "width"],
    ["rect", ["0", "0", "10", "-1"], "height"],
    ["circle", ["0", "0", "-1"], "r"],
    ["ellipse", ["0", "0", "-1", "2"], "rx"],
    ["ellipse", ["0", "0", "2", "-1"], "ry"]
  ])("rejects a negative %s %s without inserting a shape", (type, parameters, attribute) => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "rect", "existing", ["1", "2", "3", "4"]);
    const before = document.tree();

    expect(() => createFromCommand(document, type, "bad", parameters)).toThrow(
      `invalid ${attribute}: -1`
    );
    expect(document.tree()).toEqual(before);
    expect(() => document.show("bad")).toThrow("no such shape: bad");
  });

  it("allows zero dimensions and negative coordinates", () => {
    const document = new SvgDocument(800, 600);
    createFromCommand(document, "rect", "r", ["-2", "-3", "0", "0"]);
    createFromCommand(document, "circle", "c", ["-4", "-5", "0"]);
    createFromCommand(document, "ellipse", "e", ["-6", "-7", "0", "0"]);
    document.set("r", "width", "0");
    document.set("c", "cx", "-8");

    expect(document.show("r").geometry).toEqual([
      ["x", "-2"],
      ["y", "-3"],
      ["width", "0"],
      ["height", "0"]
    ]);
    expect(document.show("c").geometry).toEqual([
      ["cx", "-8"],
      ["cy", "-5"],
      ["r", "0"]
    ]);
    expect(document.show("e").geometry).toEqual([
      ["cx", "-6"],
      ["cy", "-7"],
      ["rx", "0"],
      ["ry", "0"]
    ]);
  });
});
