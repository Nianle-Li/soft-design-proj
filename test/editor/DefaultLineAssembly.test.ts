import { describe, expect, it } from "vitest";
import { LineShape } from "../../src/builtin/shapes/LineShape";
import { LineShapeProvider } from "../../src/builtin/shapes/LineShapeProvider";
import { EditorSession } from "../../src/core/editor/EditorSession";
import type { ShapeProvider } from "../../src/core/model/ShapeProvider";
import { ShapeProviderRegistry } from "../../src/core/model/ShapeProviderRegistry";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";

describe("default line assembly", () => {
  it("preserves Phase 1 coordinates, stroke and argument errors", () => {
    const registry = new ShapeProviderRegistry([new LineShapeProvider()]);
    const plain = registry.create("line", "plain", ["-2", "3", "0", "4"]);
    const stroked = registry.create("line", "stroked", ["1", "2", "3", "4", "red"]);

    expect(plain).toBeInstanceOf(LineShape);
    expect(plain.toDetailsView("svg")).toMatchObject({
      geometry: [
        ["x1", "-2"],
        ["y1", "3"],
        ["x2", "0"],
        ["y2", "4"]
      ],
      style: {}
    });
    expect(stroked.toDetailsView("svg").style).toEqual({ stroke: "red" });
    expect(() => registry.create("line", "bad", ["1", "2", "3"])).toThrow(
      "invalid arguments for line"
    );
    expect(() => registry.create("line", "bad", ["1", "2", "3", "4", "red", "extra"])).toThrow(
      "invalid arguments for line"
    );
    expect(() => registry.create("line", "bad", ["1", "2", "Infinity", "4"])).toThrow(
      "invalid number: Infinity"
    );
    expect(() => registry.create("line", "bad", ["1", "2", "3", "4", ""])).toThrow(
      "invalid stroke: value must not be empty"
    );
  });

  it("registers line by default and rejects an optional duplicate", () => {
    const registry = createDefaultShapeProviders();
    expect(registry.create("line", "l1", ["0", "0", "1", "2"])).toBeInstanceOf(LineShape);
    expect(() => createDefaultShapeProviders([new LineShapeProvider()])).toThrow(
      "duplicate registration: shapes/line"
    );
  });

  it("routes through a replaceable provider and preserves one undo unit", () => {
    const calls: string[][] = [];
    const provider: ShapeProvider = {
      type: "line",
      create(id, parameters) {
        calls.push([id, ...parameters]);
        return new LineShape(id, 7, 8, 9, 10);
      }
    };
    const session = new EditorSession(undefined, new ShapeProviderRegistry([provider]));
    session.init();

    expect(session.create("line", "l1", ["0", "0", "1", "2"]).label).toBe("line#l1");
    expect(calls).toEqual([["l1", "0", "0", "1", "2"]]);
    expect(session.show("l1").geometry).toEqual([
      ["x1", "7"],
      ["y1", "8"],
      ["x2", "9"],
      ["y2", "10"]
    ]);
    session.undo();
    expect(session.tree().roots).toEqual([]);
    session.redo();
    expect(session.show("l1").geometry[0]).toEqual(["x1", "7"]);

    const defaultSession = new EditorSession(undefined, createDefaultShapeProviders());
    defaultSession.init();
    defaultSession.create("line", "l2", ["0", "0", "1", "2"]);
    defaultSession.undo();
    expect(() => defaultSession.create("line", "bad", ["0", "0", "1", "NaN"])).toThrow(
      "invalid number: NaN"
    );
    expect(defaultSession.tree().roots).toEqual([]);
    expect(defaultSession.redo()).toMatchObject({ label: "line#l2", action: "created" });
  });
});
