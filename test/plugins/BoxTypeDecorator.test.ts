import { describe, expect, it } from "vitest";
import { AttributeHandlerRegistry } from "../../src/core/model/AttributeHandlerRegistry";
import { EditorSession } from "../../src/core/editor/EditorSession";
import { TreeDecoratorRegistry } from "../../src/core/tree/TreeDecoratorRegistry";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";
import { CliApp } from "../../src/host/cli/CliApp";
import { BoxShapeProvider } from "../../plugins/box/BoxShapeProvider";
import { BoxTypeDecorator } from "../../plugins/box/BoxTypeDecorator";
import { ModifiedStarDecorator } from "../../plugins/modified-star/ModifiedStarDecorator";

describe("BoxTypeDecorator", () => {
  it("labels semantic box views without parsing their display label", () => {
    const decorator = new BoxTypeDecorator();
    expect(
      decorator.decorate({
        kind: "shape",
        shape: {
          kind: "box",
          isContainer: true,
          label: "not-a-conventional-label",
          details: [],
          children: []
        }
      })
    ).toBe("(box)");
    expect(
      decorator.decorate({
        kind: "shape",
        shape: { kind: "g", isContainer: true, label: "g#plain", details: [], children: [] }
      })
    ).toBeUndefined();
  });

  it("coexists with modified-star in registration order and keeps independent state", () => {
    const decorators = new TreeDecoratorRegistry([
      new ModifiedStarDecorator(),
      new BoxTypeDecorator()
    ]);
    const session = new EditorSession(
      {
        read: () => {
          throw new Error("not used");
        },
        write: (_path, document) => document.tree().roots.length
      },
      createDefaultShapeProviders([new BoxShapeProvider()]),
      new AttributeHandlerRegistry([])
    );
    const app = new CliApp(session, [], decorators);

    app.runLine("init 200 100");
    app.runLine('create box n1 10 20 100 40 "Title"');
    expect(app.runLine("tree")).toEqual([
      "svg (200x100) *",
      "└── g#n1 * (box)",
      "    ├── rect#n1-rect  x=10 y=20 w=100 h=40 fill=#4a90d9 *",
      '    └── text#n1-label (30,45) "Title" *'
    ]);

    app.runLine("save saved.svg");
    expect(app.runLine("tree")).toEqual([
      "svg (200x100)",
      "└── g#n1 (box)",
      "    ├── rect#n1-rect  x=10 y=20 w=100 h=40 fill=#4a90d9",
      '    └── text#n1-label (30,45) "Title"'
    ]);
  });

  it("leaves the same box tree undecorated when the plugin is disabled", () => {
    const session = new EditorSession(
      undefined,
      createDefaultShapeProviders([new BoxShapeProvider()]),
      new AttributeHandlerRegistry([])
    );
    const app = new CliApp(session);
    app.runLine("init 200 100");
    app.runLine('create box n1 10 20 100 40 "Title"');

    expect(app.runLine("tree")[1]).toBe("└── g#n1");
  });
});
