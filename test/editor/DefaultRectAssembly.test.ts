import { describe, expect, it } from "vitest";
import { RectShape } from "../../src/builtin/shapes/RectShape";
import { RectShapeProvider } from "../../src/builtin/shapes/RectShapeProvider";
import { EditorSession } from "../../src/core/editor/EditorSession";
import type { ShapeProvider } from "../../src/core/model/ShapeProvider";
import { ShapeProviderRegistry } from "../../src/core/model/ShapeProviderRegistry";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";

describe("default rect assembly", () => {
  it("constructs a rectangle with Phase 1 geometry, optional fill and errors", () => {
    const registry = new ShapeProviderRegistry([new RectShapeProvider()]);
    const plain = registry.create("rect", "plain", ["-2", "3", "0", "4"]);
    const filled = registry.create("rect", "filled", ["1", "2", "3", "4", "red"]);

    expect(plain).toBeInstanceOf(RectShape);
    expect(plain.toDetailsView("svg")).toMatchObject({
      geometry: [
        ["x", "-2"],
        ["y", "3"],
        ["width", "0"],
        ["height", "4"]
      ],
      style: {}
    });
    expect(filled.toDetailsView("svg").style).toEqual({ fill: "red" });
    expect(() => registry.create("rect", "bad", ["1", "2", "3"])).toThrow(
      "invalid arguments for rect"
    );
    expect(() => registry.create("rect", "bad", ["1", "2", "3", "4", "red", "extra"])).toThrow(
      "invalid arguments for rect"
    );
    expect(() => registry.create("rect", "bad", ["1", "2", "NaN", "4"])).toThrow(
      "invalid number: NaN"
    );
    expect(() => registry.create("rect", "bad", ["1", "2", "-3", "4"])).toThrow(
      "invalid width: -3"
    );
    expect(() => registry.create("rect", "bad", ["1", "2", "3", "4", ""])).toThrow(
      "invalid fill: value must not be empty"
    );
  });

  it("registers rect by default and rejects an optional duplicate", () => {
    const registry = createDefaultShapeProviders();
    expect(registry.create("rect", "r1", ["0", "0", "1", "1"])).toBeInstanceOf(RectShape);
    expect(() => createDefaultShapeProviders([new RectShapeProvider()])).toThrow(
      "duplicate registration: shapes/rect"
    );
  });

  it("routes rect creation through an injected provider and keeps one undo unit", () => {
    const calls: string[][] = [];
    const provider: ShapeProvider = {
      type: "rect",
      create(id, parameters) {
        calls.push([id, ...parameters]);
        return new RectShape(id, 7, 8, 9, 10);
      }
    };
    const session = new EditorSession(undefined, new ShapeProviderRegistry([provider]));
    session.init();

    expect(session.create("rect", "r1", ["0", "0", "1", "1"]).label).toBe("rect#r1");
    expect(calls).toEqual([["r1", "0", "0", "1", "1"]]);
    expect(session.show("r1").geometry).toEqual([
      ["x", "7"],
      ["y", "8"],
      ["width", "9"],
      ["height", "10"]
    ]);
    session.undo();
    expect(session.tree().roots).toEqual([]);
    session.redo();
    expect(session.show("r1").geometry[0]).toEqual(["x", "7"]);
  });

  it("keeps the prior redo entry when a default rect request fails", () => {
    const session = new EditorSession(undefined, createDefaultShapeProviders());
    session.init();
    session.create("rect", "r1", ["0", "0", "1", "1"]);
    session.undo();

    expect(() => session.create("rect", "bad", ["0", "0", "-1", "1"])).toThrow("invalid width: -1");
    expect(session.tree().roots).toEqual([]);
    expect(session.redo()).toMatchObject({ label: "rect#r1", action: "created" });
  });
});
