import { describe, expect, it } from "vitest";
import { GroupShape } from "../../src/builtin/shapes/GroupShape";
import { EditorSession } from "../../src/core/editor/EditorSession";
import { ShapeProviderRegistry } from "../../src/core/model/ShapeProviderRegistry";
import type { ShapeProvider } from "../../src/core/model/ShapeProvider";
import { RectShape } from "../../src/builtin/shapes/RectShape";
import { RectShapeProvider } from "../../src/builtin/shapes/RectShapeProvider";
import { SvgDocument } from "../../src/model/SvgDocument";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";

class CountingGroupProvider implements ShapeProvider {
  readonly type = "g";
  readonly calls: string[] = [];

  create(id: string): GroupShape {
    this.calls.push(id);
    return new GroupShape(id);
  }
}

describe("default g assembly", () => {
  it("registers ordinary g and rejects an optional provider with the same name", () => {
    const registry = createDefaultShapeProviders();
    expect(registry.create("g", "outer", [])).toBeInstanceOf(GroupShape);
    expect(() => createDefaultShapeProviders([new CountingGroupProvider()])).toThrow(
      "duplicate registration: shapes/g"
    );
  });

  it("uses the registered g provider for create and group as one undoable edit each", () => {
    const provider = new CountingGroupProvider();
    const session = new EditorSession(
      undefined,
      new ShapeProviderRegistry([provider, new RectShapeProvider()])
    );
    session.init();

    expect(session.create("g", "outer", []).label).toBe("g#outer");
    session.create("rect", "r1", ["0", "0", "1", "1"], "outer");
    expect(session.group("bundle", ["r1"]).label).toBe("g#bundle");
    expect(provider.calls).toEqual(["outer", "bundle"]);
    expect(session.show("r1").parentLabel).toBe("g#bundle");

    session.undo();
    expect(session.show("r1").parentLabel).toBe("g#outer");
    session.redo();
    expect(session.show("r1").parentLabel).toBe("g#bundle");
  });

  it("rejects grouping without a registered g provider and preserves redo", () => {
    const session = new EditorSession(
      undefined,
      new ShapeProviderRegistry([new RectShapeProvider()])
    );
    session.init();
    session.create("rect", "r1", ["0", "0", "1", "1"]);
    session.create("rect", "r2", ["1", "0", "1", "1"]);
    session.undo();
    const before = session.tree();

    expect(() => session.group("bundle", ["r1"])).toThrow(
      "unknown shape type: g (is the plugin loaded?)"
    );
    expect(session.tree()).toEqual(before);
    expect(session.redo()).toMatchObject({ label: "rect#r2", action: "created" });
  });

  it("rejects a g provider that returns a leaf before changing the group targets", () => {
    const registry = new ShapeProviderRegistry([
      { type: "g", create: (id) => new RectShape(id, 0, 0, 1, 1) }
    ]);
    const document = new SvgDocument(100, 100, registry);
    document.createCandidate(new RectShape("r1", 0, 0, 1, 1));
    const before = document.tree();

    expect(() => document.group("bundle", ["r1"])).toThrow(
      "registered g provider must return a container"
    );
    expect(document.tree()).toEqual(before);
    expect(document.show("r1").parentLabel).toBe("svg");
  });

  it("rejects a prefilled group before moving any target", () => {
    const registry = new ShapeProviderRegistry([
      {
        type: "g",
        create(id) {
          const group = new GroupShape(id);
          group.insertChild(0, new RectShape("hidden", 0, 0, 1, 1));
          return group;
        }
      }
    ]);
    const document = new SvgDocument(100, 100, registry);
    document.createCandidate(new RectShape("r1", 0, 0, 1, 1));
    const before = document.tree();

    expect(() => document.group("bundle", ["r1"])).toThrow(
      "registered g provider must return an empty container"
    );
    expect(document.tree()).toEqual(before);
  });

  it("rejects a container with a different SVG tag before changing the document", () => {
    class WrongTagGroup extends GroupShape {
      override get kind(): string {
        return "box";
      }
    }
    const registry = new ShapeProviderRegistry([
      { type: "g", create: (id) => new WrongTagGroup(id) }
    ]);
    const document = new SvgDocument(100, 100, registry);
    document.createCandidate(new RectShape("r1", 0, 0, 1, 1));
    const before = document.tree();

    expect(() => document.group("bundle", ["r1"])).toThrow(
      "registered g provider must return an SVG group"
    );
    expect(document.tree()).toEqual(before);
  });
});
