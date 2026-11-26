import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PluginInstaller } from "../../src/host/assembly/PluginInstaller";
import { PluginLoader } from "../../src/host/assembly/PluginLoader";

describe("repository plugin configuration", () => {
  it("loads the submitted configuration through the production loader", async () => {
    const installer = new PluginInstaller({
      tree: () => ({ width: 1, height: 1, roots: [] })
    });

    await expect(new PluginLoader(installer).load(resolve("plugins.config.json"))).resolves.toEqual(
      []
    );
    const contributions = installer.contributions();
    expect(contributions.shapes.map((shape) => shape.type)).toEqual(["box", "diamond"]);
    expect(contributions.commands.map((command) => command.name)).toEqual(["stats", "dir"]);
    expect(contributions.decorators.map((decorator) => decorator.name)).toEqual([
      "modified-star",
      "box-type-label"
    ]);
    expect(contributions.attributes.map((handler) => handler.name)).toEqual(["box-attributes"]);
  });
});
