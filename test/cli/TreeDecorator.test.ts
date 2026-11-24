import { describe, expect, it } from "vitest";
import type { TreeDecorator, TreeDecorationTarget, TreeView } from "../../src/core/plugin-api";
import { TreeDecoratorRegistry } from "../../src/core/tree/TreeDecoratorRegistry";
import { TreeFormatter } from "../../src/host/cli/TreeFormatter";
import { EditorSession } from "../../src/core/editor/EditorSession";
import { AttributeHandlerRegistry } from "../../src/core/model/AttributeHandlerRegistry";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";
import { CliApp } from "../../src/host/cli/CliApp";

function decorator(
  name: string,
  decorate: (target: TreeDecorationTarget) => string | undefined,
  resetBaseline: (tree: TreeView) => void = () => undefined
): TreeDecorator {
  return { name, decorate, resetBaseline };
}

const tree: TreeView = {
  width: 100,
  height: 80,
  roots: [
    {
      kind: "g",
      isContainer: true,
      label: "g#outer",
      details: [],
      children: [
        {
          kind: "rect",
          isContainer: false,
          label: "rect#r1",
          details: [{ kind: "attribute", name: "x", value: "1" }],
          children: []
        }
      ]
    }
  ]
};

describe("TreeDecoratorRegistry", () => {
  it("rejects duplicate names", () => {
    const tag = decorator("tag", () => undefined);
    expect(() => new TreeDecoratorRegistry([tag, tag])).toThrow(
      "duplicate registration: decorators/tag"
    );
  });

  it("composes semantic labels in registration order", () => {
    const registry = new TreeDecoratorRegistry([
      decorator("first", (target) => (target.kind === "canvas" ? "*" : `[${target.shape.kind}]`)),
      decorator("second", (target) =>
        target.kind === "shape" && target.shape.isContainer ? "(container)" : undefined
      )
    ]);

    expect(new TreeFormatter(registry).format(tree)).toEqual([
      "svg (100x80) *",
      "└── g#outer [g] (container)",
      "    └── rect#r1    x=1 [rect]"
    ]);
  });

  it("preserves exact Phase 1 formatting when no decorator is registered", () => {
    expect(new TreeFormatter(new TreeDecoratorRegistry([])).format(tree)).toEqual([
      "svg (100x80)",
      "└── g#outer",
      "    └── rect#r1    x=1"
    ]);
  });

  it.each(["", "   ", "bad\nlabel"])("rejects an invalid label %j", (label) => {
    const registry = new TreeDecoratorRegistry([decorator("broken", () => label)]);
    expect(() => registry.labels({ kind: "canvas", tree })).toThrow(
      "tree decorator broken returned an invalid label"
    );
  });

  it("resets each stateful decorator with a read-only baseline", () => {
    const baselines: TreeView[] = [];
    const registry = new TreeDecoratorRegistry([
      decorator(
        "stateful",
        () => undefined,
        (baseline) => baselines.push(baseline)
      )
    ]);

    registry.resetBaseline(tree);
    expect(baselines).toEqual([tree]);
  });

  it("moves the baseline only after successful session boundaries", () => {
    const baselines: TreeView[] = [];
    let writeFails = true;
    const registry = new TreeDecoratorRegistry([
      decorator(
        "stateful",
        () => undefined,
        (baseline) => baselines.push(baseline)
      )
    ]);
    const session = new EditorSession(
      {
        read: () => {
          throw new Error("not used");
        },
        write: () => {
          if (writeFails) throw new Error("write failed");
          return 1;
        }
      },
      createDefaultShapeProviders(),
      new AttributeHandlerRegistry([])
    );
    const app = new CliApp(session, [], registry);

    app.runLine("init 100 80");
    app.runLine("create rect r1 1 2 3 4");
    expect(baselines.map((baseline) => baseline.roots.length)).toEqual([0]);
    expect(() => app.runLine("save saved.svg")).toThrow("write failed");
    expect(baselines.map((baseline) => baseline.roots.length)).toEqual([0]);
    writeFails = false;
    app.runLine("save saved.svg");
    expect(baselines.map((baseline) => baseline.roots.length)).toEqual([0, 1]);
  });
});
