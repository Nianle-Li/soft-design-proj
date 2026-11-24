import type { Command } from "../../core/command/Command";
import type { AttributeHandler } from "../../core/model/AttributeHandler";
import { EditorError } from "../../core/model/EditorError";
import type { ShapeProvider } from "../../core/model/ShapeProvider";
import type { Plugin, PluginContext } from "../../core/plugin/Plugin";
import type { TreeDecorator } from "../../core/tree/TreeDecorator";

const categories = ["shapes", "commands", "decorators", "attributes"] as const;
type Category = (typeof categories)[number];

export type PluginContributes = Readonly<Partial<Record<Category, readonly string[]>>>;

export interface PluginInstallation {
  readonly name: string;
  readonly contributes?: PluginContributes;
  readonly plugin: Plugin;
  readonly options?: unknown;
}

export interface PluginContributions {
  readonly shapes: readonly ShapeProvider[];
  readonly commands: readonly Command[];
  readonly decorators: readonly TreeDecorator[];
  readonly attributes: readonly AttributeHandler[];
}

class DuplicateRegistrationError extends EditorError {}

/** Atomically validates and publishes one plugin's four extension categories. */
export class PluginInstaller {
  private readonly accepted: {
    shapes: ShapeProvider[];
    commands: Command[];
    decorators: TreeDecorator[];
    attributes: AttributeHandler[];
  } = { shapes: [], commands: [], decorators: [], attributes: [] };

  install(installation: PluginInstallation): void {
    const staged = { shapes: [], commands: [], decorators: [], attributes: [] } as {
      shapes: ShapeProvider[];
      commands: Command[];
      decorators: TreeDecorator[];
      attributes: AttributeHandler[];
    };
    const context: PluginContext = {
      registerShape: (value) => {
        this.stage(staged.shapes, this.accepted.shapes, value, "shapes");
      },
      registerCommand: (value) => {
        this.stage(staged.commands, this.accepted.commands, value, "commands");
      },
      registerDecorator: (value) => {
        this.stage(staged.decorators, this.accepted.decorators, value, "decorators");
      },
      registerAttribute: (value) => {
        this.stage(staged.attributes, this.accepted.attributes, value, "attributes");
      }
    };

    try {
      installation.plugin.activate(context, installation.options);
    } catch (error) {
      if (error instanceof DuplicateRegistrationError) throw error;
      const reason = error instanceof Error ? error.message : String(error);
      throw new EditorError(`plugin failed to activate: ${installation.name} (${reason})`);
    }

    const declared = this.namesFromManifest(installation.contributes);
    const registered = this.namesFromContributions(staged);
    if (categories.some((category) => !this.sameNames(declared[category], registered[category]))) {
      throw new EditorError(
        `plugin manifest mismatch: ${installation.name} (declared: ${this.describe(declared)}, registered: ${this.describe(registered)})`
      );
    }

    this.accepted.shapes.push(...staged.shapes);
    this.accepted.commands.push(...staged.commands);
    this.accepted.decorators.push(...staged.decorators);
    this.accepted.attributes.push(...staged.attributes);
  }

  contributions(): PluginContributions {
    return {
      shapes: [...this.accepted.shapes],
      commands: [...this.accepted.commands],
      decorators: [...this.accepted.decorators],
      attributes: [...this.accepted.attributes]
    };
  }

  private stage<T extends { readonly name?: string; readonly type?: string }>(
    staged: T[],
    accepted: readonly T[],
    value: T,
    category: Category
  ): void {
    const name = category === "shapes" ? value.type : value.name;
    if (name === undefined) throw new Error(`missing registration name for ${category}`);
    if (
      [...accepted, ...staged].some(
        (item) => (category === "shapes" ? item.type : item.name) === name
      )
    ) {
      throw new DuplicateRegistrationError(`duplicate registration: ${category}/${name}`);
    }
    staged.push(value);
  }

  private namesFromManifest(
    contributes: PluginContributes | undefined
  ): Record<Category, string[]> {
    return {
      shapes: [...(contributes?.shapes ?? [])].sort(),
      commands: [...(contributes?.commands ?? [])].sort(),
      decorators: [...(contributes?.decorators ?? [])].sort(),
      attributes: [...(contributes?.attributes ?? [])].sort()
    };
  }

  private namesFromContributions(contributions: PluginContributions): Record<Category, string[]> {
    return {
      shapes: contributions.shapes.map((value) => value.type).sort(),
      commands: contributions.commands.map((value) => value.name).sort(),
      decorators: contributions.decorators.map((value) => value.name).sort(),
      attributes: contributions.attributes.map((value) => value.name).sort()
    };
  }

  private sameNames(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((name, index) => name === right[index]);
  }

  private describe(names: Readonly<Record<Category, readonly string[]>>): string {
    return categories.map((category) => `${category}=[${names[category].join(",")}]`).join("; ");
  }
}
