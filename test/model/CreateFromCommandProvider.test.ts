import { expect, it } from "vitest";
import { GroupShape } from "../../src/builtin/shapes/GroupShape";
import { ShapeProviderRegistry } from "../../src/core/model/ShapeProviderRegistry";
import { createDefaultDocument } from "../support/createDefaultDocument";
import { createFromCommand } from "../support/createFromCommand";

it("lets the command test helper create a provider-only shape", () => {
  const document = createDefaultDocument(40, 30);
  const providers = new ShapeProviderRegistry([
    { type: "frame", create: (id) => new GroupShape(id) }
  ]);

  expect(createFromCommand(document, "frame", "f1", [], undefined, providers).label).toBe("g#f1");
  expect(document.tree().roots[0]?.label).toBe("g#f1");
});
