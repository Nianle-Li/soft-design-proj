import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PluginInstaller } from "../../src/host/assembly/PluginInstaller";
import { PluginLoader } from "../../src/host/assembly/PluginLoader";

const services = { tree: () => ({ width: 1, height: 1, roots: [] }) };

function writePlugin(
  root: string,
  directory: string,
  manifest: Readonly<Record<string, unknown>>,
  source: string
): string {
  const target = join(root, directory);
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, "package.json"), JSON.stringify(manifest), "utf8");
  writeFileSync(join(target, "plugin.mjs"), source, "utf8");
  return `./${directory}/plugin.mjs`;
}

describe("plugin configuration loader", () => {
  it("resolves relative modules from the config directory and installs enabled plugins in order", async () => {
    const directory = mkdtempSync(join(tmpdir(), "sw-design-plugin-loader-"));
    try {
      const first = writePlugin(
        directory,
        "first",
        { name: "first-plugin", contributes: { commands: ["first"] } },
        "export default { activate(ctx, options) { ctx.registerCommand({ name: 'first', help: 'first', execute: () => [options.value] }); } };"
      );
      const last = writePlugin(
        directory,
        "last",
        { name: "last-plugin", contributes: { commands: ["last"] } },
        "export default { activate(ctx) { ctx.registerCommand({ name: 'last', help: 'last', execute: () => [] }); } };"
      );
      const configPath = join(directory, "plugins.config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          plugins: [
            { module: first, options: { value: "configured" } },
            { module: "./disabled/missing.mjs", enabled: false },
            { module: last }
          ]
        }),
        "utf8"
      );
      const installer = new PluginInstaller(services);

      await expect(new PluginLoader(installer).load(configPath)).resolves.toEqual([]);
      const commands = installer.contributions().commands;
      expect(commands.map((command) => command.name)).toEqual(["first", "last"]);
      expect(commands[0]?.execute([])).toEqual(["configured"]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("reports invalid configuration once and publishes no optional contributions", async () => {
    const directory = mkdtempSync(join(tmpdir(), "sw-design-plugin-loader-"));
    try {
      const configPath = join(directory, "plugins.config.json");
      writeFileSync(configPath, "not json", "utf8");
      const installer = new PluginInstaller(services);

      await expect(new PluginLoader(installer).load(configPath)).resolves.toEqual([
        "error: invalid plugin config"
      ]);
      expect(installer.contributions()).toEqual({
        shapes: [],
        commands: [],
        decorators: [],
        attributes: []
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("classifies top-level absence separately and continues after independent failures", async () => {
    const directory = mkdtempSync(join(tmpdir(), "sw-design-plugin-loader-"));
    try {
      const noDefault = writePlugin(
        directory,
        "no-default",
        { name: "no-default-plugin", contributes: {} },
        "export const value = 1;"
      );
      const broken = writePlugin(
        directory,
        "broken",
        { name: "broken-plugin", contributes: {} },
        "import './missing-dependency.mjs'; export default { activate() {} };"
      );
      const mismatch = writePlugin(
        directory,
        "mismatch",
        { name: "mismatch-plugin", contributes: { commands: ["declared"] } },
        "export default { activate(ctx) { ctx.registerCommand({ name: 'actual', help: 'actual', execute: () => [] }); } };"
      );
      const good = writePlugin(
        directory,
        "good",
        { name: "good-plugin", contributes: { commands: ["good"] } },
        "export default { activate(ctx) { ctx.registerCommand({ name: 'good', help: 'good', execute: () => [] }); } };"
      );
      const configPath = join(directory, "plugins.config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          plugins: [
            { module: "./absent/plugin.mjs" },
            { module: noDefault },
            { module: broken },
            { module: mismatch },
            { module: good }
          ]
        }),
        "utf8"
      );
      const installer = new PluginInstaller(services);

      const errors = await new PluginLoader(installer).load(configPath);
      expect(errors[0]).toBe("error: plugin not found: ./absent/plugin.mjs");
      expect(errors[1]).toBe(`error: plugin has no default export: ${noDefault}`);
      expect(errors[2]).toMatch(/^error: plugin failed to activate: broken-plugin \(/u);
      expect(errors[2]).not.toContain("plugin not found");
      expect(errors[3]).toContain("error: plugin manifest mismatch: mismatch-plugin");
      expect(installer.contributions().commands.map((command) => command.name)).toEqual(["good"]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
