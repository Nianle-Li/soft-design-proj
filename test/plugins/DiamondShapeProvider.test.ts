import { describe, expect, it } from "vitest";
import { DiamondShapeProvider } from "../../plugins/diamond/DiamondShapeProvider";
import { AttributeHandlerRegistry } from "../../src/core/model/AttributeHandlerRegistry";
import { EditorSession } from "../../src/core/editor/EditorSession";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";

function session(): EditorSession {
  const providers = createDefaultShapeProviders([new DiamondShapeProvider()]);
  return new EditorSession(undefined, providers, new AttributeHandlerRegistry([]));
}

describe("DiamondShapeProvider", () => {
  it("creates four registered line edges from a bounding box", () => {
    const editor = session();
    editor.init();

    editor.create("diamond", "decision", ["10", "20", "100", "60", "blue"]);

    expect(editor.tree("decision").roots[0]).toMatchObject({
      kind: "diamond",
      isContainer: true,
      label: "diamond#decision",
      children: [
        { label: "line#decision-edge-1" },
        { label: "line#decision-edge-2" },
        { label: "line#decision-edge-3" },
        { label: "line#decision-edge-4" }
      ]
    });
    expect(editor.show("decision-edge-1").geometry).toEqual([
      ["x1", "60"],
      ["y1", "20"],
      ["x2", "110"],
      ["y2", "50"]
    ]);
    expect(editor.show("decision-edge-1").style).toEqual({ stroke: "blue" });
  });

  it("moves, scales, deletes and restores the complete diamond", () => {
    const editor = session();
    editor.init();
    editor.create("diamond", "decision", ["10", "20", "100", "60"]);

    editor.move("decision", 5, 10);
    expect(editor.show("decision-edge-1").geometry).toEqual([
      ["x1", "65"],
      ["y1", "30"],
      ["x2", "115"],
      ["y2", "60"]
    ]);
    editor.undo();
    expect(editor.show("decision-edge-1").geometry[0]).toEqual(["x1", "60"]);
    editor.redo();

    editor.scale("decision", 2);
    expect(editor.show("decision-edge-1").geometry[0]).toEqual(["x1", "130"]);
    editor.delete("decision");
    expect(editor.tree().roots).toEqual([]);
    editor.undo();
    expect(editor.tree("decision").roots[0]?.children).toHaveLength(4);
  });

  it("protects its required edges and refuses ungroup", () => {
    const editor = session();
    editor.init();
    editor.create("diamond", "decision", ["0", "0", "100", "60"]);
    editor.create("g", "destination", []);

    expect(() => editor.delete("decision-edge-1")).toThrow(
      "cannot detach required diamond part: decision-edge-1"
    );
    expect(() => editor.addTo("destination", "decision-edge-2")).toThrow(
      "cannot detach required diamond part: decision-edge-2"
    );
    expect(() => editor.ungroup("decision")).toThrow("cannot ungroup composite shape: decision");
  });

  it("rejects invalid geometry and derived id collisions atomically", () => {
    const editor = session();
    editor.init();

    expect(() => editor.create("diamond", "few", ["0", "0", "10"])).toThrow(
      "invalid arguments for diamond"
    );
    expect(() => editor.create("diamond", "bad", ["x", "0", "10", "10"])).toThrow(
      "invalid number: x"
    );
    expect(() => editor.create("diamond", "negative", ["0", "0", "-1", "10"])).toThrow(
      "invalid width: -1"
    );

    editor.create("line", "decision-edge-3", ["0", "0", "1", "1"]);
    const before = editor.tree();
    expect(() => editor.create("diamond", "decision", ["0", "0", "10", "10"])).toThrow(
      "id already exists: decision-edge-3"
    );
    expect(editor.tree()).toEqual(before);
    expect(() => editor.tree("decision")).toThrow("no such shape: decision");
  });

  it("serializes as a semantic group without exposing concrete line classes", () => {
    const providers = createDefaultShapeProviders([new DiamondShapeProvider()]);
    const diamond = providers.create("diamond", "decision", ["0", "0", "100", "60"]);

    expect(diamond.toSvgNode()).toMatchObject({
      tag: "g",
      attributes: [
        ["id", "decision"],
        ["data-kind", "diamond"]
      ],
      children: [{ tag: "line" }, { tag: "line" }, { tag: "line" }, { tag: "line" }]
    });
  });
});
