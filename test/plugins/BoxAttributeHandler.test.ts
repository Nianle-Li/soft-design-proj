import { describe, expect, it } from "vitest";
import { AttributeHandlerRegistry } from "../../src/core/model/AttributeHandlerRegistry";
import { EditorSession } from "../../src/core/editor/EditorSession";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";
import { BoxAttributeHandler } from "../../plugins/box/BoxAttributeHandler";
import { BoxShapeProvider } from "../../plugins/box/BoxShapeProvider";

function session(): EditorSession {
  return new EditorSession(
    undefined,
    createDefaultShapeProviders([new BoxShapeProvider()]),
    new AttributeHandlerRegistry([new BoxAttributeHandler()])
  );
}

describe("BoxAttributeHandler", () => {
  it("propagates fill to the frame as one undo and redo unit", () => {
    const editor = session();
    editor.init();
    editor.create("box", "n1", ["10", "20", "100", "40", "Title"]);

    editor.set("n1", "fill", "#f5a623");
    expect(editor.show("n1-rect").style).toEqual({ fill: "#f5a623" });
    expect(editor.show("n1").style).toEqual({});
    editor.undo();
    expect(editor.show("n1-rect").style).toEqual({ fill: "#4a90d9" });
    editor.redo();
    expect(editor.show("n1-rect").style).toEqual({ fill: "#f5a623" });
  });

  it("propagates label to the title as one undo and redo unit", () => {
    const editor = session();
    editor.init();
    editor.create("box", "n1", ["10", "20", "100", "40", "Title"]);

    editor.set("n1", "label", "Title v2");
    expect(editor.show("n1-label").text).toBe("Title v2");
    editor.undo();
    expect(editor.show("n1-label").text).toBe("Title");
    editor.redo();
    expect(editor.show("n1-label").text).toBe("Title v2");
  });

  it("does not intercept ordinary groups or Phase 1 shape attributes", () => {
    const editor = session();
    editor.init();
    editor.create("g", "group", []);
    editor.create("rect", "rect", ["0", "0", "10", "10"]);

    editor.set("group", "fill", "red");
    editor.set("rect", "width", "20");
    expect(editor.show("group").style).toEqual({ fill: "red" });
    expect(editor.show("rect").geometry).toContainEqual(["width", "20"]);
    expect(() => editor.set("group", "label", "ignored")).toThrow("unknown attribute: label");
  });

  it("reports a matched handler validation failure without changing box state", () => {
    const editor = session();
    editor.init();
    editor.create("box", "n1", ["10", "20", "100", "40", "Title"]);

    expect(() => editor.set("n1", "fill", "")).toThrow("invalid fill: value must not be empty");
    expect(editor.show("n1-rect").style).toEqual({ fill: "#4a90d9" });
    expect(editor.undo()).toMatchObject({ kind: "shape", action: "removed" });
  });
});
