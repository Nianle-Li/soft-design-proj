import { describe, expect, it } from "vitest";
import { AttributeHandlerRegistry } from "../../src/core/model/AttributeHandlerRegistry";
import { EditorSession } from "../../src/core/editor/EditorSession";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";
import { BoxShapeProvider } from "../../plugins/box/BoxShapeProvider";

function session(): EditorSession {
  const providers = createDefaultShapeProviders([new BoxShapeProvider()]);
  return new EditorSession(undefined, providers, new AttributeHandlerRegistry([]));
}

describe("BoxShapeProvider", () => {
  it("creates the required rect and text through the registered creation context", () => {
    const editor = session();
    editor.init(800, 600);

    editor.create("box", "n1", ["120", "100", "160", "60", "开始"]);
    expect(editor.tree("n1").roots[0]).toEqual({
      kind: "box",
      isContainer: true,
      label: "g#n1",
      details: [],
      children: [
        {
          kind: "rect",
          isContainer: false,
          label: "rect#n1-rect",
          details: [
            { kind: "attribute", name: "x", value: "120" },
            { kind: "attribute", name: "y", value: "100" },
            { kind: "attribute", name: "width", value: "160" },
            { kind: "attribute", name: "height", value: "60" },
            { kind: "attribute", name: "fill", value: "#4a90d9" }
          ],
          children: []
        },
        {
          kind: "text",
          isContainer: false,
          label: "text#n1-label",
          details: [
            {
              kind: "positionedText",
              position: { x: "140", y: "135" },
              text: "开始"
            }
          ],
          children: []
        }
      ]
    });
  });

  it("moves, scales, deletes and restores the complete subtree as one unit", () => {
    const editor = session();
    editor.init();
    editor.create("box", "n1", ["10", "20", "100", "40", "Title"]);

    editor.move("n1", 5, 10);
    expect(editor.show("n1-rect").geometry).toEqual([
      ["x", "15"],
      ["y", "30"],
      ["width", "100"],
      ["height", "40"]
    ]);
    expect(editor.show("n1-label").geometry).toEqual([
      ["x", "35"],
      ["y", "55"]
    ]);
    editor.undo();
    expect(editor.show("n1-rect").geometry[0]).toEqual(["x", "10"]);
    editor.redo();

    editor.scale("n1", 2);
    expect(editor.show("n1-rect").geometry).toEqual([
      ["x", "30"],
      ["y", "60"],
      ["width", "200"],
      ["height", "80"]
    ]);
    editor.delete("n1");
    expect(editor.tree().roots).toEqual([]);
    editor.undo();
    expect(editor.tree("n1").roots[0]?.children).toHaveLength(2);
  });

  it("allows nesting while protecting required parts and refusing ungroup", () => {
    const editor = session();
    editor.init();
    editor.create("box", "outer", ["0", "0", "100", "40", "Outer"]);
    editor.create("box", "inner", ["10", "10", "50", "20", "Inner"], "outer");
    editor.create("g", "destination", []);

    expect(editor.tree("outer").roots[0]?.children[2]?.label).toBe("g#inner");
    expect(() => editor.delete("outer-rect")).toThrow(
      "cannot detach required box part: outer-rect"
    );
    expect(() => editor.addTo("destination", "outer-label")).toThrow(
      "cannot detach required box part: outer-label"
    );
    expect(() => editor.ungroup("outer")).toThrow("cannot ungroup composite shape: outer");
  });

  it("rejects a derived id collision before attaching any box member", () => {
    const editor = session();
    editor.init();
    editor.create("rect", "n1-label", ["0", "0", "1", "1"]);
    const before = editor.tree();

    expect(() => editor.create("box", "n1", ["0", "0", "10", "10", "Title"])).toThrow(
      "id already exists: n1-label"
    );
    expect(editor.tree()).toEqual(before);
    expect(() => editor.tree("n1")).toThrow("no such shape: n1");
    expect(() => editor.tree("n1-rect")).toThrow("no such shape: n1-rect");
  });

  it("validates its own argument count and delegates geometry validation", () => {
    const editor = session();
    editor.init();

    expect(() => editor.create("box", "few", ["0", "0", "10", "10"])).toThrow(
      "invalid arguments for box"
    );
    expect(() => editor.create("box", "bad", ["x", "0", "10", "10", "Title"])).toThrow(
      "invalid number: x"
    );
    expect(() => editor.create("box", "negative", ["0", "0", "-1", "10", "Title"])).toThrow(
      "invalid width: -1"
    );
  });

  it("serializes as an SVG group with the box marker", () => {
    const providers = createDefaultShapeProviders([new BoxShapeProvider()]);
    const box = providers.create("box", "n1", ["1", "2", "30", "20", "Title"]);

    expect(box.toSvgNode()).toMatchObject({
      tag: "g",
      attributes: [
        ["id", "n1"],
        ["data-kind", "box"]
      ],
      children: [{ tag: "rect" }, { tag: "text" }]
    });
  });
});
