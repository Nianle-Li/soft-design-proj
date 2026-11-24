import { describe, expect, it } from "vitest";
import type { AttributeHandler, PreparedSet, Shape } from "../../src/core/plugin-api";
import { AttributeHandlerRegistry } from "../../src/core/model/AttributeHandlerRegistry";
import { EditorSession } from "../../src/core/editor/EditorSession";
import { createDefaultShapeProviders } from "../../src/host/assembly/DefaultShapes";
import { SvgDocument } from "../../src/core/model/SvgDocument";
import { createFromCommand } from "../support/createFromCommand";

function handler(
  name: string,
  handles: (shape: Shape, attribute: string) => boolean,
  prepare: (shape: Shape, attribute: string, value: string) => PreparedSet
): AttributeHandler {
  return { name, handles, prepare };
}

describe("AttributeHandlerRegistry", () => {
  it("rejects duplicate names", () => {
    const first = handler(
      "box",
      () => false,
      () => {
        throw new Error("not called");
      }
    );
    expect(() => new AttributeHandlerRegistry([first, first])).toThrow(
      "duplicate registration: attributes/box"
    );
  });

  it("rejects ambiguous matches before preparing either handler", () => {
    const prepared: string[] = [];
    const handlers = ["first", "second"].map((name) =>
      handler(
        name,
        () => true,
        () => {
          prepared.push(name);
          throw new Error("must not prepare");
        }
      )
    );
    const registry = new AttributeHandlerRegistry(handlers);
    const document = new SvgDocument(100, 100, createDefaultShapeProviders(), registry);
    createFromCommand(document, "rect", "r1", ["1", "2", "3", "4"]);

    expect(() => document.set("r1", "fill", "red")).toThrow(
      "multiple attribute handlers for rect#r1.fill: first, second"
    );
    expect(prepared).toEqual([]);
    expect(document.explicitStyle("r1")).toEqual({});
  });
});

describe("SvgDocument attribute handlers", () => {
  it("uses one matching handler as one reversible set operation", () => {
    const registry = new AttributeHandlerRegistry([
      handler(
        "accent",
        (shape, attribute) => shape.kind === "rect" && attribute === "accent",
        (shape, _attribute, value) => shape.prepareSet("fill", value)
      )
    ]);
    const document = new SvgDocument(100, 100, createDefaultShapeProviders(), registry);
    createFromCommand(document, "rect", "r1", ["1", "2", "3", "4"]);

    const receipt = document.set("r1", "accent", "red");
    expect(document.explicitStyle("r1")).toEqual({ fill: "red" });
    document.undoSet(receipt);
    expect(document.explicitStyle("r1")).toEqual({});
    document.redoSet(receipt);
    expect(document.explicitStyle("r1")).toEqual({ fill: "red" });
  });

  it("keeps the Phase 1 fallback only when no handler matches", () => {
    const document = new SvgDocument(
      100,
      100,
      createDefaultShapeProviders(),
      new AttributeHandlerRegistry([])
    );
    createFromCommand(document, "rect", "r1", ["1", "2", "3", "4"]);

    document.set("r1", "fill", "blue");
    expect(document.explicitStyle("r1")).toEqual({ fill: "blue" });
    expect(() => document.set("r1", "label", "ignored")).toThrow("unknown attribute: label");
  });

  it("does not fall back when a matching handler fails during preparation", () => {
    const registry = new AttributeHandlerRegistry([
      handler(
        "broken",
        (_shape, attribute) => attribute === "fill",
        () => {
          throw new Error("handler failed");
        }
      )
    ]);
    const document = new SvgDocument(100, 100, createDefaultShapeProviders(), registry);
    createFromCommand(document, "rect", "r1", ["1", "2", "3", "4"]);

    expect(() => document.set("r1", "fill", "red")).toThrow("handler failed");
    expect(document.explicitStyle("r1")).toEqual({});
  });

  it("rolls back a partial apply and leaves failed set out of history", () => {
    const registry = new AttributeHandlerRegistry([
      handler(
        "partial",
        (_shape, attribute) => attribute === "accent",
        (shape, _attribute, value) => {
          const fill = shape.prepareSet("fill", value);
          return {
            value: fill.value,
            previousValue: fill.previousValue,
            apply: () => {
              fill.apply();
              throw new Error("apply failed");
            },
            undo: () => {
              fill.undo();
            }
          };
        }
      )
    ]);
    const shapes = createDefaultShapeProviders();
    const session = new EditorSession(undefined, shapes, registry);
    session.init(100, 100);
    session.create("rect", "r1", ["1", "2", "3", "4"]);

    expect(() => session.set("r1", "accent", "red")).toThrow("apply failed");
    expect(session.show("r1").style).toEqual({});
    expect(session.undo()).toMatchObject({ kind: "shape", action: "removed" });
  });

  it("also rolls back a partial apply during redo", () => {
    let applications = 0;
    const registry = new AttributeHandlerRegistry([
      handler(
        "redo-failure",
        (_shape, attribute) => attribute === "accent",
        (shape, _attribute, value) => {
          const fill = shape.prepareSet("fill", value);
          return {
            value: fill.value,
            previousValue: fill.previousValue,
            apply: () => {
              fill.apply();
              applications += 1;
              if (applications === 2) throw new Error("redo failed");
            },
            undo: () => {
              fill.undo();
            }
          };
        }
      )
    ]);
    const document = new SvgDocument(100, 100, createDefaultShapeProviders(), registry);
    createFromCommand(document, "rect", "r1", ["1", "2", "3", "4"]);
    const receipt = document.set("r1", "accent", "red");
    document.undoSet(receipt);

    expect(() => {
      document.redoSet(receipt);
    }).toThrow("redo failed");
    expect(document.explicitStyle("r1")).toEqual({});
  });
});
