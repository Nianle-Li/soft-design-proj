import { describe, expect, it } from "vitest";
import { EllipseShape } from "../../src/builtin/shapes/EllipseShape";
import { EllipseShapeProvider } from "../../src/builtin/shapes/EllipseShapeProvider";
import { EditorSession } from "../../src/core/editor/EditorSession";
import type { ShapeProvider } from "../../src/core/model/ShapeProvider";
import { ShapeProviderRegistry } from "../../src/core/model/ShapeProviderRegistry";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";

describe("default ellipse assembly", () => {
  it("preserves Phase 1 arguments, geometry, fill and errors", () => {
    const registry = new ShapeProviderRegistry([new EllipseShapeProvider()]);
    const plain = registry.create("ellipse", "plain", ["-2", "3", "0", "4"]);
    const filled = registry.create("ellipse", "filled", ["1", "2", "3", "4", "red"]);

    expect(plain).toBeInstanceOf(EllipseShape);
    expect(plain.toDetailsView("svg")).toMatchObject({
      geometry: [
        ["cx", "-2"],
        ["cy", "3"],
        ["rx", "0"],
        ["ry", "4"]
      ],
      style: {}
    });
    expect(filled.toDetailsView("svg").style).toEqual({ fill: "red" });
    expect(() => registry.create("ellipse", "bad", ["1", "2", "3"])).toThrow(
      "invalid arguments for ellipse"
    );
    expect(() => registry.create("ellipse", "bad", ["1", "2", "3", "4", "red", "extra"])).toThrow(
      "invalid arguments for ellipse"
    );
    expect(() => registry.create("ellipse", "bad", ["1", "2", "NaN", "4"])).toThrow(
      "invalid number: NaN"
    );
    expect(() => registry.create("ellipse", "bad", ["1", "2", "-3", "4"])).toThrow(
      "invalid rx: -3"
    );
    expect(() => registry.create("ellipse", "bad", ["1", "2", "3", "-4"])).toThrow(
      "invalid ry: -4"
    );
    expect(() => registry.create("ellipse", "bad", ["1", "2", "3", "4", ""])).toThrow(
      "invalid fill: value must not be empty"
    );
  });

  it("registers ellipse by default and rejects an optional duplicate", () => {
    const registry = createDefaultShapeProviders();
    expect(registry.create("ellipse", "e1", ["0", "0", "1", "2"])).toBeInstanceOf(EllipseShape);
    expect(() => createDefaultShapeProviders([new EllipseShapeProvider()])).toThrow(
      "duplicate registration: shapes/ellipse"
    );
  });

  it("routes through a replaceable provider as one undo unit and preserves redo on failure", () => {
    const calls: string[][] = [];
    const provider: ShapeProvider = {
      type: "ellipse",
      create(id, parameters) {
        calls.push([id, ...parameters]);
        return new EllipseShape(id, 7, 8, 9, 10);
      }
    };
    const session = new EditorSession(undefined, new ShapeProviderRegistry([provider]));
    session.init();

    expect(session.create("ellipse", "e1", ["0", "0", "1", "2"]).label).toBe("ellipse#e1");
    expect(calls).toEqual([["e1", "0", "0", "1", "2"]]);
    expect(session.show("e1").geometry).toEqual([
      ["cx", "7"],
      ["cy", "8"],
      ["rx", "9"],
      ["ry", "10"]
    ]);
    session.undo();
    expect(session.tree().roots).toEqual([]);
    session.redo();
    expect(session.show("e1").geometry[0]).toEqual(["cx", "7"]);

    const defaultSession = new EditorSession(undefined, createDefaultShapeProviders());
    defaultSession.init();
    defaultSession.create("ellipse", "e2", ["0", "0", "1", "2"]);
    defaultSession.undo();
    expect(() => defaultSession.create("ellipse", "bad", ["0", "0", "-1", "2"])).toThrow(
      "invalid rx: -1"
    );
    expect(defaultSession.tree().roots).toEqual([]);
    expect(defaultSession.redo()).toMatchObject({ label: "ellipse#e2", action: "created" });
  });
});
