import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, parse, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Plugin } from "../../core/plugin/Plugin";
import { parsePluginConfig } from "./PluginConfig";
import type { PluginContributes } from "./PluginInstaller";
import { PluginInstaller } from "./PluginInstaller";

interface PackageManifest {
  readonly name: string;
  readonly contributes: PluginContributes;
}

/** Loads independent configured modules while keeping resolution failures isolated per plugin. */
export class PluginLoader {
  constructor(private readonly installer: PluginInstaller) {}

  async load(configPath: string): Promise<readonly string[]> {
    let entries;
    try {
      entries = parsePluginConfig(readFileSync(configPath, "utf8"));
    } catch {
      return ["error: invalid plugin config"];
    }

    const errors: string[] = [];
    const resolver = createRequire(resolve(configPath));
    for (const entry of entries) {
      let entryPath: string;
      try {
        entryPath = resolver.resolve(entry.module);
      } catch {
        errors.push(`error: plugin not found: ${entry.module}`);
        continue;
      }

      let manifest: PackageManifest;
      try {
        manifest = this.readManifest(entryPath);
      } catch (error) {
        errors.push(this.activationError(entry.module, error));
        continue;
      }

      let loaded: Record<string, unknown>;
      try {
        loaded = (await import(pathToFileURL(entryPath).href)) as Record<string, unknown>;
      } catch (error) {
        errors.push(this.activationError(manifest.name, error));
        continue;
      }
      if (!("default" in loaded)) {
        errors.push(`error: plugin has no default export: ${entry.module}`);
        continue;
      }
      const plugin = loaded.default;
      if (!isRecord(plugin) || typeof plugin.activate !== "function") {
        errors.push(this.activationError(manifest.name, new Error("invalid default export")));
        continue;
      }

      try {
        this.installer.install({
          name: manifest.name,
          contributes: manifest.contributes,
          plugin: plugin as unknown as Plugin,
          options: entry.options
        });
      } catch (error) {
        errors.push(`error: ${this.reason(error)}`);
      }
    }
    return errors;
  }

  private readManifest(entryPath: string): PackageManifest {
    const root = parse(entryPath).root;
    for (let directory = dirname(entryPath); ; directory = dirname(directory)) {
      const path = resolve(directory, "package.json");
      if (existsSync(path)) return this.parseManifest(readFileSync(path, "utf8"));
      if (directory === root) break;
    }
    throw new Error("missing package manifest");
  }

  private parseManifest(source: string): PackageManifest {
    const parsed: unknown = JSON.parse(source);
    if (!isRecord(parsed) || typeof parsed.name !== "string" || parsed.name.trim() === "") {
      throw new Error("invalid package manifest");
    }
    const contributes = parsed.contributes ?? {};
    if (!isRecord(contributes)) throw new Error("invalid package manifest");
    for (const category of ["shapes", "commands", "decorators", "attributes"] as const) {
      const names = contributes[category];
      if (
        names !== undefined &&
        (!Array.isArray(names) || names.some((name) => typeof name !== "string"))
      ) {
        throw new Error("invalid package manifest");
      }
    }
    return { name: parsed.name, contributes };
  }

  private activationError(name: string, error: unknown): string {
    return `error: plugin failed to activate: ${name} (${this.reason(error)})`;
  }

  private reason(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
