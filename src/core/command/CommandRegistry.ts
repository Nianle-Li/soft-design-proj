import { EditorError } from "../model/EditorError";
import type { Command } from "./Command";

/** Owns command-name selection and preserves help order. */
export class CommandRegistry {
  private readonly commands = new Map<string, Command>();

  constructor(commands: readonly Command[]) {
    for (const command of commands) {
      if (this.commands.has(command.name)) {
        throw new EditorError(`duplicate registration: commands/${command.name}`);
      }
      this.commands.set(command.name, command);
    }
  }

  execute(name: string, args: readonly string[]): readonly string[] {
    const command = this.commands.get(name);
    if (command === undefined) throw new EditorError(`unknown command: ${name}`);
    return command.execute(args);
  }

  help(): readonly string[] {
    return [...this.commands.values()].map((command) => command.help);
  }
}
