import { describe, expect, it } from "vitest";
import { TextShape } from "../../src/builtin/shapes/TextShape";
import { TextShapeProvider } from "../../src/builtin/shapes/TextShapeProvider";
import { EditorSession } from "../../src/core/editor/EditorSession";
import type { ShapeProvider } from "../../src/core/model/ShapeProvider";
import { ShapeProviderRegistry } from "../../src/core/model/ShapeProviderRegistry";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";

describe("default text assembly", () => {
  it("preserves Phase 1 position, literal text and argument errors", () => {
    const registry = new ShapeProviderRegistry([new TextShapeProvider()]);
    const ordinary = registry.create("text", "label", ["-2", "3", "开始 & <结束>"]);
    const empty = registry.create("text", "empty", ["0", "0", ""]);

    expect(ordinary).toBeInstanceOf(TextShape);
    expect(ordinary.toDetailsView("svg")).toMatchObject({
      geometry: [
        ["x", "-2"],
        ["y", "3"]
      ],
      text: "开始 & <结束>"
    });
    expect(ordinary.toSvgNode().text).toBe("开始 & <结束>");
    expect(empty.toDetailsView("svg").text).toBe("");
    expect(() => registry.create("text", "bad", ["1", "2"])).toThrow("invalid arguments for text");
    expect(() => registry.create("text", "bad", ["1", "2", "x", "extra"])).toThrow(
      "invalid arguments for text"
    );
    expect(() => registry.create("text", "bad", ["Infinity", "2", "x"])).toThrow(
      "invalid number: Infinity"
    );
  });

  it("registers text by default and rejects an optional duplicate", () => {
    const registry = createDefaultShapeProviders();
    expect(registry.create("text", "t1", ["0", "0", "x"])).toBeInstanceOf(TextShape);
    expect(() => createDefaultShapeProviders([new TextShapeProvider()])).toThrow(
      "duplicate registration: shapes/text"
    );
  });

  it("routes through a replaceable provider and preserves undo and redo", () => {
    const calls: string[][] = [];
    const provider: ShapeProvider = {
      type: "text",
      create(id, parameters) {
        calls.push([id, ...parameters]);
        return new TextShape(id, 7, 8, "replacement");
      }
    };
    const session = new EditorSession(undefined, new ShapeProviderRegistry([provider]));
    session.init();

    expect(session.create("text", "t1", ["0", "0", "original"]).label).toBe("text#t1");
    expect(calls).toEqual([["t1", "0", "0", "original"]]);
    expect(session.show("t1").text).toBe("replacement");
    session.undo();
    expect(session.tree().roots).toEqual([]);
    session.redo();
    expect(session.show("t1").text).toBe("replacement");

    const defaultSession = new EditorSession(undefined, createDefaultShapeProviders());
    defaultSession.init();
    defaultSession.create("text", "t2", ["0", "0", "okay"]);
    defaultSession.undo();
    expect(() => defaultSession.create("text", "bad", ["NaN", "0", "x"])).toThrow(
      "invalid number: NaN"
    );
    expect(defaultSession.tree().roots).toEqual([]);
    expect(defaultSession.redo()).toMatchObject({ label: "text#t2", action: "created" });
  });
});
