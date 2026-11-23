import { describe, expect, it } from "vitest";
import { CircleShape } from "../../src/builtin/shapes/CircleShape";
import { CircleShapeProvider } from "../../src/builtin/shapes/CircleShapeProvider";
import { EditorSession } from "../../src/core/editor/EditorSession";
import type { ShapeProvider } from "../../src/core/model/ShapeProvider";
import { ShapeProviderRegistry } from "../../src/core/model/ShapeProviderRegistry";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";

describe("default circle assembly", () => {
  it("constructs a circle with Phase 1 arguments and errors", () => {
    const registry = new ShapeProviderRegistry([new CircleShapeProvider()]);
    const plain = registry.create("circle", "plain", ["-2", "3", "0"]);
    const filled = registry.create("circle", "filled", ["1", "2", "3", "red"]);

    expect(plain).toBeInstanceOf(CircleShape);
    expect(plain.toDetailsView("svg")).toMatchObject({
      geometry: [
        ["cx", "-2"],
        ["cy", "3"],
        ["r", "0"]
      ],
      style: {}
    });
    expect(filled.toDetailsView("svg").style).toEqual({ fill: "red" });
    expect(() => registry.create("circle", "bad", ["1", "2"])).toThrow(
      "invalid arguments for circle"
    );
    expect(() => registry.create("circle", "bad", ["1", "2", "3", "red", "extra"])).toThrow(
      "invalid arguments for circle"
    );
    expect(() => registry.create("circle", "bad", ["1", "2", "Infinity"])).toThrow(
      "invalid number: Infinity"
    );
    expect(() => registry.create("circle", "bad", ["1", "2", "-3"])).toThrow("invalid r: -3");
    expect(() => registry.create("circle", "bad", ["1", "2", "3", ""])).toThrow(
      "invalid fill: value must not be empty"
    );
  });

  it("registers circle by default and rejects an optional duplicate", () => {
    const registry = createDefaultShapeProviders();
    expect(registry.create("circle", "c1", ["0", "0", "1"])).toBeInstanceOf(CircleShape);
    expect(() => createDefaultShapeProviders([new CircleShapeProvider()])).toThrow(
      "duplicate registration: shapes/circle"
    );
  });

  it("routes circle creation through an injected provider as one undo unit", () => {
    const calls: string[][] = [];
    const provider: ShapeProvider = {
      type: "circle",
      create(id, parameters) {
        calls.push([id, ...parameters]);
        return new CircleShape(id, 7, 8, 9);
      }
    };
    const session = new EditorSession(undefined, new ShapeProviderRegistry([provider]));
    session.init();

    expect(session.create("circle", "c1", ["0", "0", "1"]).label).toBe("circle#c1");
    expect(calls).toEqual([["c1", "0", "0", "1"]]);
    expect(session.show("c1").geometry).toEqual([
      ["cx", "7"],
      ["cy", "8"],
      ["r", "9"]
    ]);
    session.undo();
    expect(session.tree().roots).toEqual([]);
    session.redo();
    expect(session.show("c1").geometry[0]).toEqual(["cx", "7"]);
  });

  it("keeps the previous redo entry when a default circle request fails", () => {
    const session = new EditorSession(undefined, createDefaultShapeProviders());
    session.init();
    session.create("circle", "c1", ["0", "0", "1"]);
    session.undo();

    expect(() => session.create("circle", "bad", ["0", "0", "-1"])).toThrow("invalid r: -1");
    expect(session.tree().roots).toEqual([]);
    expect(session.redo()).toMatchObject({ label: "circle#c1", action: "created" });
  });
});
