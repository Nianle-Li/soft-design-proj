import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import boxPlugin, { boxManifest } from "../../plugins/box";
import dirPlugin, { dirManifest } from "../../plugins/dir";
import modifiedStarPlugin, { modifiedStarManifest } from "../../plugins/modified-star";
import statsPlugin, { statsManifest } from "../../plugins/stats";
import type { TreeView } from "../../src/core/plugin-api";
import { PluginInstaller } from "../../src/host/assembly/PluginInstaller";

describe("code plugin activation", () => {
  it.each([
    ["box", boxManifest],
    ["dir", dirManifest],
    ["modified-star", modifiedStarManifest],
    ["stats", statsManifest]
  ])("keeps the %s code manifest equal to package metadata", (directory, manifest) => {
    const metadata = JSON.parse(
      readFileSync(resolve("plugins", directory, "package.json"), "utf8")
    ) as Record<string, unknown>;
    expect({ name: metadata.name, contributes: metadata.contributes }).toEqual(manifest);
  });

  it("installs the existing optional plugins through one validated path", () => {
    let tree: TreeView = { width: 1, height: 1, roots: [] };
    const installer = new PluginInstaller({ tree: () => tree });
    installer.install({ ...boxManifest, plugin: boxPlugin });
    installer.install({ ...modifiedStarManifest, plugin: modifiedStarPlugin });
    installer.install({ ...statsManifest, plugin: statsPlugin });
    installer.install({ ...dirManifest, plugin: dirPlugin });

    const contributions = installer.contributions();
    expect(contributions.shapes.map((provider) => provider.type)).toEqual(["box"]);
    expect(contributions.attributes.map((handler) => handler.name)).toEqual(["box-attributes"]);
    expect(contributions.decorators.map((decorator) => decorator.name)).toEqual([
      "box-type-label",
      "modified-star"
    ]);
    expect(contributions.commands.map((command) => command.name)).toEqual(["stats", "dir"]);

    const stats = contributions.commands[0];
    expect(stats?.execute([])).toEqual(["(total 0, containers 0)"]);
    tree = {
      width: 1,
      height: 1,
      roots: [
        {
          kind: "rect",
          label: "rect#r",
          isContainer: false,
          details: [],
          children: []
        }
      ]
    };
    expect(stats?.execute([])).toEqual(["rect: 1  (total 1, containers 0)"]);
  });
});
