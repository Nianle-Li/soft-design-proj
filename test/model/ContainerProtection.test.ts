import { describe, expect, it } from "vitest";
import { EditorSession } from "../../src/core/editor/EditorSession";
import { ContainerShape } from "../../src/core/model/ContainerShape";
import { EditorError } from "../../src/core/model/EditorError";
import { GroupShape } from "../../src/builtin/shapes/GroupShape";
import { RectShape } from "../../src/builtin/shapes/RectShape";
import type { Shape } from "../../src/core/model/Shape";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";
import { createDefaultDocument } from "../support/createDefaultDocument";

class GuardedContainer extends ContainerShape {
  override get kind(): string {
    return "g";
  }

  protected override geometryAttributes(): readonly (readonly [string, string])[] {
    return [];
  }

  override assertCanDetach(child: Shape): void {
    super.assertCanDetach(child);
    if (child.id === `${this.id}-fixed`) {
      throw new EditorError(`protected child: ${child.id}`);
    }
  }

  override assertCanUngroup(): void {
    throw new EditorError(`cannot ungroup composite shape: ${this.id}`);
  }
}

function guarded(id = "box"): GuardedContainer {
  const shape = new GuardedContainer(id);
  shape.insertChild(0, new RectShape(`${id}-fixed`, 0, 0, 1, 1));
  shape.insertChild(1, new RectShape(`${id}-free`, 1, 0, 1, 1));
  return shape;
}

describe("container structural prechecks", () => {
  it("accepts and indexes a nested candidate inside a non-group container", () => {
    const document = createDefaultDocument(100, 100);
    document.createCandidate(guarded("outer"));
    const nested = document.createCandidate(guarded("inner"), "outer");

    expect(document.show("inner").parentLabel).toBe("g#outer");
    expect(document.show("inner-fixed").parentLabel).toBe("g#inner");
    document.undoCreation(nested);
    expect(() => document.show("inner-fixed")).toThrow("no such shape: inner-fixed");
    document.restoreCreation(nested);
    expect(document.show("inner-fixed").parentLabel).toBe("g#inner");
  });

  it("rejects deleting a required child while allowing the whole container to be deleted", () => {
    const document = createDefaultDocument(100, 100);
    document.createCandidate(guarded());
    const before = document.tree();

    expect(() => document.delete("box-fixed")).toThrow("protected child: box-fixed");
    expect(document.tree()).toEqual(before);
    const receipt = document.delete("box");
    expect(document.tree().roots).toEqual([]);
    document.restoreDeletion(receipt);
    expect(document.tree()).toEqual(before);
  });

  it("rejects moving a required child but accepts ordinary children", () => {
    const document = createDefaultDocument(100, 100);
    document.createCandidate(guarded());
    document.createCandidate(new GroupShape("dest"));
    const before = document.tree();

    expect(() => document.addTo("dest", "box-fixed")).toThrow("protected child: box-fixed");
    expect(document.tree()).toEqual(before);
    document.addTo("dest", "box-free");
    expect(document.show("box-free").parentLabel).toBe("g#dest");
  });

  it("prechecks every group target before moving any subtree", () => {
    const document = createDefaultDocument(100, 100);
    document.createCandidate(guarded());
    document.createCandidate(new RectShape("outside", 0, 0, 1, 1));
    const before = document.tree();

    expect(() => document.group("bundle", ["box-free", "box-fixed", "outside"])).toThrow(
      "protected child: box-fixed"
    );
    expect(document.tree()).toEqual(before);
    expect(() => document.show("bundle")).toThrow("no such shape: bundle");
    expect(document.show("outside").parentLabel).toBe("svg");
  });

  it("allows grouping a whole guarded container and gives its ungroup error priority", () => {
    const document = createDefaultDocument(100, 100);
    document.createCandidate(guarded());
    const grouped = document.group("bundle", ["box"]);
    expect(document.show("box-fixed").parentLabel).toBe("g#box");
    document.undoGroup(grouped);

    expect(() => document.ungroup("box")).toThrow("cannot ungroup composite shape: box");
    document.createCandidate(new GroupShape("outer"));
    document.addTo("outer", "box");
    expect(document.show("box").parentLabel).toBe("g#outer");
    expect(() => document.ungroup("box")).toThrow("cannot ungroup composite shape: box");
  });

  it("does not ungroup a nested container required by its parent", () => {
    const document = createDefaultDocument(100, 100);
    const parent = new GuardedContainer("box");
    parent.insertChild(0, new GroupShape("box-fixed"));
    document.createCandidate(parent);
    const before = document.tree();

    expect(() => document.ungroup("box-fixed")).toThrow("protected child: box-fixed");
    expect(document.tree()).toEqual(before);
    expect(document.show("box-fixed").parentLabel).toBe("g#box");
  });

  it("preserves redo history when a guarded operation is refused", () => {
    const session = new EditorSession(
      undefined,
      createDefaultShapeProviders([{ type: "guarded", create: (id) => guarded(id) }])
    );
    session.init();
    session.create("guarded", "box", []);
    session.create("rect", "later", ["0", "0", "1", "1"]);
    session.undo();

    expect(() => session.delete("box-fixed")).toThrow("protected child: box-fixed");
    expect(session.redo()).toMatchObject({ label: "rect#later", action: "created" });
    expect(session.show("box-fixed").parentLabel).toBe("g#box");
  });

  it("still allows ordinary groups to ungroup", () => {
    const document = createDefaultDocument(100, 100);
    document.createCandidate(new GroupShape("outer"));
    document.createCandidate(new GroupShape("inner"), "outer");
    expect(document.ungroup("inner").label).toBe("g#inner");
  });
});
