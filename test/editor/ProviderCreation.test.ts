import { describe, expect, it } from "vitest";
import { EditorSession } from "../../src/core/editor/EditorSession";
import { GroupShape } from "../../src/model/GroupShape";
import { RectShape } from "../../src/model/RectShape";
import { ShapeProviderRegistry } from "../../src/model/ShapeProviderRegistry";

describe("provider-backed creation in an editor session", () => {
  it("creates a composite as one undo unit and restores all descendants on redo", () => {
    const registry = new ShapeProviderRegistry([
      {
        type: "card",
        create(id) {
          const group = new GroupShape(id);
          group.insertChild(0, new RectShape(`${id}-rect`, 0, 0, 5, 6));
          return group;
        }
      }
    ]);
    const session = new EditorSession(undefined, registry);
    session.init();
    session.create("g", "outer", []);

    expect(session.create("card", "c1", [], "outer")).toMatchObject({
      label: "g#c1",
      parentLabel: "g#outer",
      action: "created"
    });
    expect(session.show("c1-rect").parentLabel).toBe("g#c1");
    expect(session.undo()).toMatchObject({ label: "g#c1", action: "removed" });
    expect(session.tree().roots[0]?.children).toEqual([]);
    expect(session.redo()).toMatchObject({ label: "g#c1", action: "created" });
    expect(session.show("c1-rect").parentLabel).toBe("g#c1");
  });

  it("keeps the previous redo entry after provider construction fails", () => {
    const registry = new ShapeProviderRegistry([
      {
        type: "broken",
        create() {
          throw new Error("construction failed");
        }
      }
    ]);
    const session = new EditorSession(undefined, registry);
    session.init();
    session.create("rect", "r1", ["0", "0", "1", "1"]);
    session.undo();

    expect(() => session.create("broken", "bad", [])).toThrow("construction failed");
    expect(session.tree().roots).toEqual([]);
    expect(session.redo()).toMatchObject({ label: "rect#r1", action: "created" });
  });

  it("keeps the previous redo entry after candidate validation fails", () => {
    const registry = new ShapeProviderRegistry([
      {
        type: "invalid",
        create(id) {
          const group = new GroupShape(id);
          group.insertChild(0, new RectShape("bad id", 0, 0, 1, 1));
          return group;
        }
      }
    ]);
    const session = new EditorSession(undefined, registry);
    session.init();
    session.create("rect", "r1", ["0", "0", "1", "1"]);
    session.undo();

    expect(() => session.create("invalid", "bad", [])).toThrow("invalid id: bad id");
    expect(session.tree().roots).toEqual([]);
    expect(session.redo()).toMatchObject({ label: "rect#r1", action: "created" });
  });

  it("keeps Phase 1 built-ins and unknown-type errors when the optional provider is absent", () => {
    const session = new EditorSession(undefined, new ShapeProviderRegistry([]));
    session.init();
    expect(session.create("rect", "r1", ["0", "0", "1", "1"]).label).toBe("rect#r1");
    expect(() => session.create("card", "c1", [])).toThrow(
      "unknown shape type: card (is the plugin loaded?)"
    );
  });

  it("rejects a provider that collides with a Phase 1 built-in type", () => {
    const registry = new ShapeProviderRegistry([
      { type: "rect", create: (id) => new RectShape(id, 0, 0, 1, 1) }
    ]);

    expect(() => new EditorSession(undefined, registry)).toThrow(
      "duplicate registration: shapes/rect"
    );
  });
});
