import { EditorSession } from "../../core/editor/EditorSession";
import type { EditChange, ShapeChange } from "../../core/editor/EditCommand";
import type { Command } from "../../core/command/Command";
import { CommandRegistry } from "../../core/command/CommandRegistry";
import { EditorError } from "../../core/model/EditorError";
import { CommandLineParser } from "./CommandLineParser";
import { TreeFormatter } from "./TreeFormatter";
import { TreeDecoratorRegistry } from "../../core/tree/TreeDecoratorRegistry";

/** One-line application boundary; the REPL only handles streams and prompts. */
export class CliApp {
  private readonly parser = new CommandLineParser();
  private readonly treeFormatter: TreeFormatter;
  private readonly commands: CommandRegistry;

  constructor(
    private readonly session: EditorSession,
    extensions: readonly Command[] = [],
    private readonly treeDecorators = new TreeDecoratorRegistry([])
  ) {
    this.commands = new CommandRegistry([...this.builtInCommands(), ...extensions]);
    this.treeFormatter = new TreeFormatter(treeDecorators);
  }

  runLine(line: string): string[] {
    try {
      const tokens = this.parser.parse(line);
      const command = tokens[0];
      if (command === undefined) {
        return [];
      }

      return [...this.commands.execute(command, tokens.slice(1))];
    } catch (error) {
      if (error instanceof EditorError) {
        return [`error: ${error.message}`];
      }
      throw error;
    }
  }

  private builtInCommands(): readonly Command[] {
    return [
      { name: "init", help: "init [w] [h]", execute: (args) => this.init(args) },
      {
        name: "read",
        help: "read <file.svg>",
        execute: (args) => {
          if (args.length !== 1 || args[0] === undefined) {
            throw new EditorError("usage: read <file.svg>");
          }
          return this.read(args[0]);
        }
      },
      {
        name: "save",
        help: "save [file.svg]",
        execute: (args) => {
          if (args.length > 1) throw new EditorError("usage: save [file.svg]");
          return this.save(args[0]);
        }
      },
      { name: "canvas", help: "canvas [w] [h]", execute: (args) => this.canvas(args) },
      {
        name: "create",
        help: "create <type> <id> [params...] [in <containerId>]",
        execute: (args) => this.create(args)
      },
      {
        name: "delete",
        help: "delete <id>",
        execute: (args) => {
          if (args.length !== 1 || args[0] === undefined) {
            throw new EditorError("usage: delete <id>");
          }
          return [this.describeChange(this.session.delete(args[0]))];
        }
      },
      { name: "move", help: "move <id> <dx> <dy>", execute: (args) => this.move(args) },
      { name: "scale", help: "scale <id> <factor>", execute: (args) => this.scale(args) },
      { name: "set", help: "set <id> <attr> <value>", execute: (args) => this.set(args) },
      {
        name: "group",
        help: "group <newGid> <id1> [id2...]",
        execute: (args) => this.group(args)
      },
      {
        name: "ungroup",
        help: "ungroup <gid>",
        execute: (args) => {
          if (args.length !== 1 || args[0] === undefined) {
            throw new EditorError("usage: ungroup <gid>");
          }
          return [this.describeChange(this.session.ungroup(args[0]))];
        }
      },
      {
        name: "addto",
        help: "addto <gid> <id>",
        execute: (args) => {
          if (args.length !== 2 || args[0] === undefined || args[1] === undefined) {
            throw new EditorError("usage: addto <gid> <id>");
          }
          return [this.describeChange(this.session.addTo(args[0], args[1]))];
        }
      },
      {
        name: "front",
        help: "front <id>",
        execute: (args) => this.reorder(["front", ...args], "front")
      },
      {
        name: "back",
        help: "back <id>",
        execute: (args) => this.reorder(["back", ...args], "back")
      },
      { name: "tree", help: "tree [id]", execute: (args) => this.tree(args) },
      {
        name: "show",
        help: "show <id>",
        execute: (args) => {
          if (args.length !== 1 || args[0] === undefined) {
            throw new EditorError("usage: show <id>");
          }
          return this.show(args[0]);
        }
      },
      {
        name: "help",
        help: "help",
        execute: (args) => {
          this.noArguments(["help", ...args]);
          return ["Commands:", ...this.commands.help().map((line) => `  ${line}`)];
        }
      },
      {
        name: "undo",
        help: "undo",
        execute: (args) => {
          this.noArguments(["undo", ...args]);
          return [this.describeChange(this.session.undo())];
        }
      },
      {
        name: "redo",
        help: "redo",
        execute: (args) => {
          this.noArguments(["redo", ...args]);
          return [this.describeChange(this.session.redo())];
        }
      }
    ];
  }

  private init(arguments_: readonly string[]): string[] {
    if (arguments_.length !== 0 && arguments_.length !== 2) {
      throw new EditorError("usage: init [w] [h]");
    }
    const width = arguments_.length === 0 ? 800 : Number(arguments_[0]);
    const height = arguments_.length === 0 ? 600 : Number(arguments_[1]);
    const canvas = this.session.init(width, height);
    this.treeDecorators.resetBaseline(this.session.tree());
    return [`canvas ${String(canvas.width)}x${String(canvas.height)} created`];
  }

  private canvas(arguments_: readonly string[]): string[] {
    if (arguments_.length === 0) {
      const size = this.session.canvas();
      return [`canvas ${String(size.width)}x${String(size.height)}`];
    }
    if (arguments_.length !== 2) {
      throw new EditorError("usage: canvas [w] [h]");
    }
    const size = this.session.resizeCanvas(Number(arguments_[0]), Number(arguments_[1]));
    return [`canvas ${String(size.width)}x${String(size.height)} resized`];
  }

  private read(path: string): string[] {
    const result = this.session.read(path);
    this.treeDecorators.resetBaseline(this.session.tree());
    const warnings = result.assignedIds.map(
      ({ id, tag }) => `warning: assigned id ${id} to unnamed <${tag}>`
    );
    return [...warnings, `read ${path} (${String(result.count)} elements)`];
  }

  private save(path?: string): string[] {
    const result = this.session.save(path);
    this.treeDecorators.resetBaseline(this.session.tree());
    return [`saved to ${result.path} (${String(result.count)} elements)`];
  }

  private create(arguments_: readonly string[]): string[] {
    const type = arguments_[0];
    const id = arguments_[1];
    if (type === undefined || id === undefined) {
      throw new EditorError("usage: create <type> <id> [params...] [in <containerId>]");
    }
    const remaining = arguments_.slice(2);
    let parentId: string | undefined;
    if (remaining.length >= 2 && remaining.at(-2) === "in") {
      parentId = remaining.at(-1);
      remaining.splice(-2, 2);
    }
    const change = this.session.create(type, id, remaining, parentId);
    return [this.describeChange(change)];
  }

  private tree(arguments_: readonly string[]): string[] {
    if (arguments_.length > 1) {
      throw new EditorError("usage: tree [id]");
    }
    return this.treeFormatter.format(this.session.tree(arguments_[0]), arguments_[0] !== undefined);
  }

  private show(id: string): string[] {
    const details = this.session.show(id);
    const lines = [`${details.label}  parent=${details.parentLabel}`];
    if (details.geometry.length > 0) {
      lines.push(`  ${details.geometry.map(([name, value]) => `${name}=${value}`).join(" ")}`);
    }
    if (details.text !== undefined) lines.push(`  text="${details.text}"`);
    const style = details.style;
    const explicit = [
      style.fill === undefined ? undefined : `fill=${style.fill}`,
      style.stroke === undefined ? undefined : `stroke=${style.stroke}`,
      style.strokeWidth === undefined ? undefined : `stroke-width=${style.strokeWidth}`
    ].filter((value) => value !== undefined);
    if (explicit.length > 0) lines.push(`  ${explicit.join(" ")}`);
    return lines;
  }

  private move(arguments_: readonly string[]): string[] {
    if (arguments_.length !== 3 || arguments_[0] === undefined) {
      throw new EditorError("usage: move <id> <dx> <dy>");
    }
    const dx = this.finiteNumber(arguments_[1]);
    const dy = this.finiteNumber(arguments_[2]);
    return [this.describeChange(this.session.move(arguments_[0], dx, dy))];
  }

  private scale(arguments_: readonly string[]): string[] {
    if (arguments_.length !== 2 || arguments_[0] === undefined) {
      throw new EditorError("usage: scale <id> <factor>");
    }
    const factor = this.finiteNumber(arguments_[1]);
    return [this.describeChange(this.session.scale(arguments_[0], factor))];
  }

  private set(arguments_: readonly string[]): string[] {
    const [id, attribute, value] = arguments_;
    if (
      arguments_.length !== 3 ||
      id === undefined ||
      attribute === undefined ||
      value === undefined
    ) {
      throw new EditorError("usage: set <id> <attr> <value>");
    }
    return [this.describeChange(this.session.set(id, attribute, value))];
  }

  private group(arguments_: readonly string[]): string[] {
    const id = arguments_[0];
    if (id === undefined || arguments_.length < 2) {
      throw new EditorError("usage: group <newGid> <id1> [id2...]");
    }
    return [this.describeChange(this.session.group(id, arguments_.slice(1)))];
  }

  private reorder(tokens: readonly string[], edge: "front" | "back"): string[] {
    if (tokens.length !== 2 || tokens[1] === undefined) {
      throw new EditorError(`usage: ${edge} <id>`);
    }
    return [this.describeChange(this.session.reorder(tokens[1], edge))];
  }

  private finiteNumber(value: string | undefined): number {
    const number = Number(value);
    if (value === undefined || value.trim() === "" || !Number.isFinite(number)) {
      throw new EditorError(`invalid number: ${value ?? ""}`);
    }
    return number;
  }

  private noArguments(tokens: readonly string[]): void {
    if (tokens.length !== 1) {
      throw new EditorError(`usage: ${tokens[0] ?? ""}`);
    }
  }

  private describeChange(change: EditChange): string {
    if (change.kind === "move") {
      const verb = change.action === "moved" ? "moved" : "moved back";
      if (change.location.kind === "point") {
        return `${change.label} ${verb} to (${String(change.location.x)},${String(change.location.y)})`;
      }
      return `${change.label} ${verb} by (${String(change.dx)},${String(change.dy)})`;
    }
    if (change.kind === "scale") {
      return change.action === "scaled"
        ? `${change.label} scaled by ${String(change.factor)}`
        : `${change.label} scale undone`;
    }
    if (change.kind === "set") {
      if (change.value === undefined) {
        return `${change.label} ${change.attribute} removed`;
      }
      if (change.attribute === "text") {
        return `${change.label} updated: text="${change.value}"`;
      }
      if (change.effect?.kind === "propagated" && change.action === "set") {
        return `${change.label} ${change.attribute} propagated to ${change.effect.targetId}`;
      }
      if (change.effect?.kind === "text") {
        const verb = change.action === "set" ? "updated" : "restored";
        return `${change.label} ${change.attribute} ${verb}: "${change.value}"`;
      }
      const verb = change.action === "set" ? "set to" : "restored to";
      return `${change.label} ${change.attribute} ${verb} ${change.value}`;
    }
    if (change.kind === "group") {
      return change.action === "grouped"
        ? `${change.label} created with ${String(change.childCount)} children`
        : `${change.label} grouping undone`;
    }
    if (change.kind === "ungroup") {
      if (change.action === "ungrouped") {
        return `${change.label} ungrouped`;
      }
      const unit = change.childCount === 1 ? "child" : "children";
      return `${change.label} restored with ${String(change.childCount)} ${unit}`;
    }
    if (change.kind === "addto") {
      if (change.action === "added") {
        return `${change.label} added to ${change.parentLabel}`;
      }
      return change.parentLabel === undefined
        ? `${change.label} restored to canvas`
        : `${change.label} restored into ${change.parentLabel}`;
    }
    if (change.kind === "reorder") {
      return change.action === "moved"
        ? `${change.label} moved to ${change.edge}`
        : `${change.label} order restored`;
    }
    return this.describeShapeChange(change);
  }

  private describeShapeChange(change: ShapeChange): string {
    if (change.action === "removed") {
      return `${change.label} creation undone`;
    }
    if (change.action === "deleted") {
      return `${change.label} deleted`;
    }
    if (change.action === "restored") {
      const parent = change.parentLabel === undefined ? "" : ` into ${change.parentLabel}`;
      return `${change.label} restored${parent}`;
    }
    // New shape actions must receive an explicit CLI response before this assignment can compile.
    const createdAction: "created" = change.action;
    const parent = change.parentLabel === undefined ? "" : ` in ${change.parentLabel}`;
    const parts = change.parts === undefined ? "" : ` (${change.parts.join(" + ")})`;
    return `${change.label} ${createdAction}${parts}${parent}`;
  }
}
