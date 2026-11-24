import { describe, expect, it } from "vitest";
import type { ShapeView, TreeView } from "../../src/core/plugin-api";
import { AttributeHandlerRegistry } from "../../src/core/model/AttributeHandlerRegistry";
import { EditorSession } from "../../src/core/editor/EditorSession";
import { TreeDecoratorRegistry } from "../../src/core/tree/TreeDecoratorRegistry";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";
import { CliApp } from "../../src/host/cli/CliApp";
import { ModifiedStarDecorator } from "../../plugins/modified-star/ModifiedStarDecorator";

function shape(
  kind: string,
  id: string,
  children: readonly ShapeView[] = [],
  value = "1"
): ShapeView {
  return {
    kind,
    isContainer: children.length > 0 || kind === "g",
    label: `${kind}#${id}`,
    details: [{ kind: "attribute", name: "value", value }],
    children
  };
}

function tree(roots: readonly ShapeView[], width = 100): TreeView {
  return { width, height: 80, roots };
}

describe("ModifiedStarDecorator", () => {
  it("marks a changed leaf and its ancestors without marking an unchanged sibling", () => {
    const before = tree([shape("g", "outer", [shape("rect", "left"), shape("rect", "right")])]);
    const left = shape("rect", "left", [], "2");
    const right = shape("rect", "right");
    const outer = shape("g", "outer", [left, right]);
    const after = tree([outer]);
    const decorator = new ModifiedStarDecorator();
    decorator.resetBaseline(before);

    expect(decorator.decorate({ kind: "canvas", tree: after })).toBe("*");
    expect(decorator.decorate({ kind: "shape", shape: outer })).toBe("*");
    expect(decorator.decorate({ kind: "shape", shape: left })).toBe("*");
    expect(decorator.decorate({ kind: "shape", shape: right })).toBeUndefined();
  });

  it("marks a reordered parent while keeping unchanged children clean", () => {
    const left = shape("rect", "left");
    const right = shape("rect", "right");
    const decorator = new ModifiedStarDecorator();
    decorator.resetBaseline(tree([shape("g", "outer", [left, right])]));
    const outer = shape("g", "outer", [right, left]);

    expect(decorator.decorate({ kind: "shape", shape: outer })).toBe("*");
    expect(decorator.decorate({ kind: "shape", shape: left })).toBeUndefined();
    expect(decorator.decorate({ kind: "shape", shape: right })).toBeUndefined();
  });

  it("keeps baseline state isolated per decorator instance", () => {
    const original = tree([shape("rect", "r1")]);
    const changed = tree([shape("rect", "r1", [], "2")]);
    const first = new ModifiedStarDecorator();
    const second = new ModifiedStarDecorator();
    first.resetBaseline(original);
    second.resetBaseline(changed);

    expect(first.decorate({ kind: "canvas", tree: changed })).toBe("*");
    expect(second.decorate({ kind: "canvas", tree: changed })).toBeUndefined();
  });

  it("follows edit, save, edit, undo and redo savepoint semantics through the CLI", () => {
    const decorator = new ModifiedStarDecorator();
    const registry = new TreeDecoratorRegistry([decorator]);
    const session = new EditorSession(
      {
        read: () => {
          throw new Error("not used");
        },
        write: (_path, document) => document.tree().roots.length
      },
      createDefaultShapeProviders(),
      new AttributeHandlerRegistry([])
    );
    const app = new CliApp(session, [], registry);

    app.runLine("init 100 80");
    expect(app.runLine("tree")).toEqual(["svg (100x80)"]);
    app.runLine("create g outer");
    app.runLine("create rect r1 1 2 3 4 in outer");
    expect(app.runLine("tree").every((line) => line.endsWith("*"))).toBe(true);

    app.runLine("save saved.svg");
    expect(app.runLine("tree").every((line) => !line.endsWith("*"))).toBe(true);
    app.runLine("set r1 x 9");
    expect(app.runLine("tree").every((line) => line.endsWith("*"))).toBe(true);
    app.runLine("undo");
    expect(app.runLine("tree").every((line) => !line.endsWith("*"))).toBe(true);
    app.runLine("redo");
    expect(app.runLine("tree").every((line) => line.endsWith("*"))).toBe(true);
  });

  it("marks only the canvas line for a canvas-only change", () => {
    const decorator = new ModifiedStarDecorator();
    const baseline = tree([shape("rect", "r1")]);
    decorator.resetBaseline(baseline);

    expect(decorator.decorate({ kind: "canvas", tree: { ...baseline, width: 200 } })).toBe("*");
    expect(
      decorator.decorate({ kind: "shape", shape: baseline.roots[0] as ShapeView })
    ).toBeUndefined();
  });
});
