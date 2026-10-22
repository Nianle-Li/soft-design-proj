import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";

describe("all Phase 1 built-in shapes", () => {
  it("creates circle, ellipse, line and text with their own geometry", () => {
    const document = new SvgDocument(800, 600);
    document.create("circle", "c1", ["100", "120", "20", "red"]);
    document.create("ellipse", "e1", ["1.5", "2", "3", "4"]);
    document.create("line", "l1", ["0", "10", "30", "40", "black"]);
    document.create("text", "t1", ["20", "40", "My Diagram"]);

    expect(document.tree().roots).toEqual([
      { label: "circle#c1", details: "cx=100 cy=120 r=20 fill=red", children: [] },
      { label: "ellipse#e1", details: "cx=1.5 cy=2 rx=3 ry=4", children: [] },
      { label: "line#l1", details: "(0,10) -> (30,40)", children: [] },
      { label: "text#t1", details: '(20,40) "My Diagram"', children: [] }
    ]);
  });

  it("rejects missing, extra and non-finite arguments before changing the document", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "parent", []);
    const before = document.tree();

    expect(() => document.create("circle", "c1", ["1", "2"], "parent")).toThrow(
      "invalid arguments for circle"
    );
    expect(() => document.create("ellipse", "e1", ["1", "2", "NaN", "4"], "parent")).toThrow(
      "invalid number: NaN"
    );
    expect(() => document.create("line", "l1", ["1", "2", "3", "4", "black", "extra"])).toThrow(
      "invalid arguments for line"
    );
    expect(() => document.create("text", "t1", ["1", "2"])).toThrow("invalid arguments for text");
    expect(document.tree()).toEqual(before);

    document.create("circle", "c1", ["1", "2", "3"], "parent");
    expect(document.tree("parent").roots[0]?.children).toHaveLength(1);
  });

  it("preserves optional fill only when supplied", () => {
    const document = new SvgDocument(800, 600);
    document.create("circle", "plain", ["1", "2", "3"]);
    document.create("ellipse", "colored", ["4", "5", "6", "7", "#abc"]);

    expect(document.tree().roots.map((shape) => shape.details)).toEqual([
      "cx=1 cy=2 r=3",
      "cx=4 cy=5 rx=6 ry=7 fill=#abc"
    ]);
  });

  it.each([
    ["rect", ["0", "0", "-1", "10"], "width"],
    ["rect", ["0", "0", "10", "-1"], "height"],
    ["circle", ["0", "0", "-1"], "r"],
    ["ellipse", ["0", "0", "-1", "2"], "rx"],
    ["ellipse", ["0", "0", "2", "-1"], "ry"]
  ])("rejects a negative %s %s without inserting a shape", (type, parameters, attribute) => {
    const document = new SvgDocument(800, 600);
    document.create("rect", "existing", ["1", "2", "3", "4"]);
    const before = document.tree();

    expect(() => document.create(type, "bad", parameters)).toThrow(`invalid ${attribute}: -1`);
    expect(document.tree()).toEqual(before);
    expect(() => document.show("bad")).toThrow("no such shape: bad");
  });

  it("allows zero dimensions and negative coordinates", () => {
    const document = new SvgDocument(800, 600);
    document.create("rect", "r", ["-2", "-3", "0", "0"]);
    document.create("circle", "c", ["-4", "-5", "0"]);
    document.create("ellipse", "e", ["-6", "-7", "0", "0"]);
    document.set("r", "width", "0");
    document.set("c", "cx", "-8");

    expect(document.tree().roots.map((shape) => shape.details)).toEqual([
      "x=-2 y=-3 w=0 h=0",
      "cx=-8 cy=-5 r=0",
      "cx=-6 cy=-7 rx=0 ry=0"
    ]);
  });
});
