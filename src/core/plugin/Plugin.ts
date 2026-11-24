import type { Command } from "../command/Command";
import type { AttributeHandler } from "../model/AttributeHandler";
import type { ShapeProvider } from "../model/ShapeProvider";
import type { TreeDecorator } from "../tree/TreeDecorator";

/** The only registration surface visible while one plugin is being activated. */
export interface PluginContext {
  registerShape(provider: ShapeProvider): void;
  registerCommand(command: Command): void;
  registerDecorator(decorator: TreeDecorator): void;
  registerAttribute(handler: AttributeHandler): void;
}

/** A plugin contributes instances; the host owns validation and publication. */
export interface Plugin {
  activate(context: PluginContext, options: unknown): void;
}
