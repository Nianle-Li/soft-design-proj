import { describe, expect, it } from "vitest";
import { GroupShape } from "../../src/builtin/shapes/GroupShape";
import { RectShape } from "../../src/model/RectShape";
import type { Shape } from "../../src/core/model/Shape";
import { ShapeProviderRegistry } from "../../src/core/model/ShapeProviderRegistry";
import type { ShapeProvider } from "../../src/core/model/ShapeProvider";
import { SvgDocument } from "../../src/model/SvgDocument";

const rectProvider: ShapeProvider = {
  type: "rect",
  create(id, parameters) {
    const [width = "1", height = "1"] = parameters;
    return new RectShape(id, 0, 0, Number(width), Number(height));
  }
};

describe("shape provider registry", () => {
  it("selects a registered provider and lets a composite request registered children", () => {
    const composite: ShapeProvider = {
      type: "card",
      create(id, _parameters, context) {
        const group = new GroupShape(id);
        group.insertChild(0, context.create("rect", `${id}-rect`, ["7", "8"]));
        return group;
      }
    };
    const registry = new ShapeProviderRegistry([composite, rectProvider]);
    const document = new SvgDocument(100, 100);
    const receipt = document.createCandidate(registry.create("card", "item", []));

    expect(receipt.label).toBe("g#item");
    expect(document.show("item-rect").parentLabel).toBe("g#item");
    expect(document.toSvgView().roots[0]?.children[0]?.attributes).toContainEqual(["width", "7"]);
    document.undoCreation(receipt);
    expect(document.tree().roots).toEqual([]);
  });

  it("treats an omitted provider as disabled", () => {
    const registry = new ShapeProviderRegistry([rectProvider]);
    expect(registry.has("rect")).toBe(true);
    expect(registry.has("card")).toBe(false);
    expect(() => registry.create("card", "item", [])).toThrow(
      "unknown shape type: card (is the plugin loaded?)"
    );
  });

  it("rejects duplicate registration before the registry can be used", () => {
    expect(() => new ShapeProviderRegistry([rectProvider, rectProvider])).toThrow(
      "duplicate registration: shapes/rect"
    );
  });

  it("rejects a provider returning a different root id", () => {
    const registry = new ShapeProviderRegistry([
      { type: "bad", create: () => new GroupShape("unexpected") }
    ]);
    expect(() => registry.create("bad", "requested", [])).toThrow(
      "shape provider bad returned id unexpected instead of requested"
    );
  });

  it("reports a provider that violates the shape return contract at runtime", () => {
    const registry = new ShapeProviderRegistry([
      { type: "broken", create: () => null as unknown as Shape }
    ]);
    expect(() => registry.create("broken", "x", [])).toThrow(
      "shape provider broken did not return a shape"
    );
  });

  it("leaves the document unchanged when a provider throws or returns a bad tree", () => {
    const throwing: ShapeProvider = {
      type: "throwing",
      create() {
        throw new Error("provider failed");
      }
    };
    const shared: ShapeProvider = {
      type: "shared",
      create(id) {
        const group = new GroupShape(id);
        const child = new RectShape(`${id}-rect`, 0, 0, 1, 1);
        group.insertChild(0, child);
        group.insertChild(1, child);
        return group;
      }
    };
    const registry = new ShapeProviderRegistry([throwing, shared]);
    const document = new SvgDocument(100, 100);
    const before = document.tree();

    expect(() => registry.create("throwing", "x", [])).toThrow("provider failed");
    expect(() => document.createCandidate(registry.create("shared", "x", []))).toThrow(
      "duplicate shape instance"
    );
    expect(document.tree()).toEqual(before);
  });
});
