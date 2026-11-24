import { describe, expect, it } from "vitest";
import { GroupShape } from "../../src/builtin/shapes/GroupShape";
import { RectShapeProvider } from "../../src/builtin/shapes/RectShapeProvider";
import { ShapeProviderRegistry } from "../../src/core/model/ShapeProviderRegistry";
import { SvgCodec } from "../../src/adapters/svg/SvgCodec";

describe("group provider after SVG read", () => {
  it("keeps the configured provider for later grouping", () => {
    const created: string[] = [];
    const registry = new ShapeProviderRegistry([
      new RectShapeProvider(),
      {
        type: "g",
        create(id) {
          created.push(id);
          return new GroupShape(id);
        }
      }
    ]);
    const xml =
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect id="r1" x="0" y="0" width="1" height="1" /></svg>';
    const document = new SvgCodec(registry).decode(xml).document;

    document.group("bundle", ["r1"]);
    expect(created).toEqual(["bundle"]);
    expect(document.show("r1").parentLabel).toBe("g#bundle");
  });
});
