import { describe, expect, it } from "vitest";
import { GroupShape } from "../../src/builtin/shapes/GroupShape";
import { GroupShapeProvider } from "../../src/builtin/shapes/GroupShapeProvider";
import { RectShape } from "../../src/builtin/shapes/RectShape";
import { ContainerShape } from "../../src/core/model/ContainerShape";
import { ShapeProviderRegistry } from "../../src/core/model/ShapeProviderRegistry";
import { createDefaultDocument } from "../support/createDefaultDocument";

describe("built-in g provider", () => {
  it("creates an ordinary container through the shared registry", () => {
    const registry = new ShapeProviderRegistry([new GroupShapeProvider()]);
    const shape = registry.create("g", "outer", []);
    const document = createDefaultDocument(100, 100);
    const receipt = document.createCandidate(shape);

    expect(shape).toBeInstanceOf(ContainerShape);
    expect(shape).toBeInstanceOf(GroupShape);
    expect(receipt.label).toBe("g#outer");
    document.createCandidate(new RectShape("child", 0, 0, 1, 1), "outer");
    expect(document.show("child").parentLabel).toBe("g#outer");
  });

  it("keeps Phase 1's argument error for g", () => {
    const registry = new ShapeProviderRegistry([new GroupShapeProvider()]);
    expect(() => registry.create("g", "outer", ["unexpected"])).toThrow("invalid arguments for g");
  });
});
