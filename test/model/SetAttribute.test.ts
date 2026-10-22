import { describe, expect, it } from "vitest";
import { SvgDocument } from "../../src/model/SvgDocument";

describe("SvgDocument set", () => {
  it("sets each leaf's own geometric attributes and restores their previous values", () => {
    const cases: readonly (readonly [string, readonly string[], readonly string[]])[] = [
      ["rect", ["1", "2", "3", "4"], ["x", "y", "width", "height"]],
      ["circle", ["1", "2", "3"], ["cx", "cy", "r"]],
      ["ellipse", ["1", "2", "3", "4"], ["cx", "cy", "rx", "ry"]],
      ["line", ["1", "2", "3", "4"], ["x1", "y1", "x2", "y2"]],
      ["text", ["1", "2", "old"], ["x", "y"]]
    ];

    for (const [type, parameters, attributes] of cases) {
      for (const attribute of attributes) {
        const document = new SvgDocument(800, 600);
        document.create(type, "target", parameters);
        const before = document.tree();

        const receipt = document.set("target", attribute, "10.5");
        expect(document.tree()).not.toEqual(before);
        document.undoSet(receipt);
        expect(document.tree()).toEqual(before);
        document.redoSet(receipt);
        expect(document.tree()).not.toEqual(before);
      }
    }
  });

  it("sets text content without confusing it with a geometry or style attribute", () => {
    const document = new SvgDocument(800, 600);
    document.create("text", "label", ["1", "2", "old"]);

    const receipt = document.set("label", "text", "a new label");
    expect(document.tree("label").roots[0]?.details).toBe('(1,2) "a new label"');
    document.undoSet(receipt);
    expect(document.tree("label").roots[0]?.details).toBe('(1,2) "old"');
    document.redoSet(receipt);
    expect(document.tree("label").roots[0]?.details).toBe('(1,2) "a new label"');
  });

  it("keeps common style attributes on the target element and restores absence exactly", () => {
    for (const type of ["rect", "circle", "ellipse", "line", "text", "g"]) {
      const document = new SvgDocument(800, 600);
      const params: Record<string, string[]> = {
        rect: ["1", "2", "3", "4"],
        circle: ["1", "2", "3"],
        ellipse: ["1", "2", "3", "4"],
        line: ["1", "2", "3", "4"],
        text: ["1", "2", "hello"],
        g: []
      };
      document.create(type, "target", params[type] ?? []);
      expect(document.explicitStyle("target")).toEqual({});

      const fill = document.set("target", "fill", "red");
      const stroke = document.set("target", "stroke", "blue");
      const strokeWidth = document.set("target", "stroke-width", "2.5");
      expect(document.explicitStyle("target")).toEqual({
        fill: "red",
        stroke: "blue",
        strokeWidth: "2.5"
      });

      document.undoSet(strokeWidth);
      document.undoSet(stroke);
      document.undoSet(fill);
      expect(document.explicitStyle("target")).toEqual({});
    }

    const document = new SvgDocument(800, 600);
    document.create("rect", "filled", ["1", "2", "3", "4", "red"]);
    document.create("line", "outlined", ["1", "2", "3", "4", "black"]);
    expect(document.explicitStyle("filled")).toEqual({ fill: "red" });
    expect(document.explicitStyle("outlined")).toEqual({ stroke: "black" });
  });

  it("sets group style locally while preserving descendant overrides and future inheritance", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "outer", []);
    document.create("g", "inner", [], "outer");
    document.create("rect", "explicit", ["1", "2", "3", "4", "green"], "inner");
    document.create("rect", "implicit", ["5", "6", "7", "8"], "inner");
    const before = document.tree();

    const receipt = document.set("outer", "fill", "red");
    document.create("circle", "later", ["1", "2", "3"], "inner");
    expect(document.explicitStyle("outer")).toEqual({ fill: "red" });
    expect(document.explicitStyle("inner")).toEqual({});
    expect(document.explicitStyle("explicit")).toEqual({ fill: "green" });
    expect(document.explicitStyle("implicit")).toEqual({});
    expect(document.explicitStyle("later")).toEqual({});

    document.undoSet(receipt);
    expect(document.explicitStyle("outer")).toEqual({});
    expect(document.tree("inner").roots[0]?.children.slice(0, 2)).toEqual(
      before.roots[0]?.children[0]?.children
    );
  });

  it("rejects unknown attributes and invalid numeric values without touching the document", () => {
    const document = new SvgDocument(800, 600);
    document.create("g", "group", []);
    document.create("rect", "rect", ["1", "2", "3", "4"], "group");
    const before = document.tree();

    expect(() => document.set("rect", "opacity", "0.5")).toThrow("unknown attribute: opacity");
    expect(() => document.set("group", "x", "2")).toThrow("unknown attribute: x");
    expect(() => document.set("rect", "width", "Infinity")).toThrow("invalid number: Infinity");
    expect(() => document.set("group", "stroke-width", "-1")).toThrow("invalid stroke-width: -1");
    expect(() => document.set("group", "fill", "")).toThrow(
      "invalid fill: value must not be empty"
    );
    expect(() => document.set("missing", "fill", "red")).toThrow("no such shape: missing");
    expect(document.tree()).toEqual(before);
    expect(document.explicitStyle("group")).toEqual({});
  });
});
