import { describe, expect, it } from "vitest";
import { EditorError } from "../../src/core/model/EditorError";
import type { Command } from "../../src/core/command/Command";
import { CommandRegistry } from "../../src/core/command/CommandRegistry";
import { CliApp } from "../../src/host/cli/CliApp";
import { createDefaultEditorSession } from "../support/createDefaultEditorSession";

class EchoCommand implements Command {
  readonly name = "echo";
  readonly help = "echo <value>";

  execute(args: readonly string[]): string[] {
    if (args.length !== 1) throw new EditorError("usage: echo <value>");
    return [args[0] ?? ""];
  }
}

describe("command extension contract", () => {
  it("selects and lists registered commands in registration order", () => {
    const registry = new CommandRegistry([new EchoCommand()]);
    expect(registry.execute("echo", ["hello"])).toEqual(["hello"]);
    expect(registry.help()).toEqual(["echo <value>"]);
    expect(() => registry.execute("missing", [])).toThrow("unknown command: missing");
  });

  it("rejects duplicate command names", () => {
    expect(() => new CommandRegistry([new EchoCommand(), new EchoCommand()])).toThrow(
      "duplicate registration: commands/echo"
    );
  });

  it("runs a plugin command before init without changing editor history", () => {
    const app = new CliApp(createDefaultEditorSession(), [new EchoCommand()]);
    expect(app.runLine('echo "hello world"')).toEqual(["hello world"]);
    expect(app.runLine("echo")).toEqual(["error: usage: echo <value>"]);
    expect(app.runLine("help").at(-1)).toBe("  echo <value>");
    expect(app.runLine("undo")).toEqual(["error: no document. use 'init' or 'read' first"]);
  });

  it("preserves redo after a plugin command succeeds or rejects its arguments", () => {
    const app = new CliApp(createDefaultEditorSession(), [new EchoCommand()]);
    app.runLine("init");
    app.runLine("create rect r 0 0 1 1");
    app.runLine("undo");

    expect(app.runLine("echo value")).toEqual(["value"]);
    expect(app.runLine("echo")).toEqual(["error: usage: echo <value>"]);
    expect(app.runLine("redo")).toEqual(["rect#r created"]);
  });

  it("treats an omitted plugin as unknown and rejects a built-in name collision", () => {
    expect(new CliApp(createDefaultEditorSession()).runLine("echo x")).toEqual([
      "error: unknown command: echo"
    ]);
    expect(
      () =>
        new CliApp(createDefaultEditorSession(), [
          { name: "init", help: "init", execute: () => ["shadowed"] }
        ])
    ).toThrow("duplicate registration: commands/init");
  });
});
