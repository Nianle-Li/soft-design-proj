import { EditorSession } from "../editor/EditorSession";
import type { EditChange } from "../editor/EditCommand";
import { EditorError } from "../editor/EditorError";
import { CommandLineParser } from "./CommandLineParser";
import { TreeFormatter } from "./TreeFormatter";

/** One-line application boundary; the REPL only handles streams and prompts. */
export class CliApp {
  private readonly parser = new CommandLineParser();
  private readonly treeFormatter = new TreeFormatter();

  constructor(private readonly session: EditorSession) {}

  runLine(line: string): string[] {
    try {
      const tokens = this.parser.parse(line);
      const command = tokens[0];
      if (command === undefined) {
        return [];
      }

      // This is the one command-name dispatch site allowed by the assignment.
      switch (command) {
        case "init":
          return this.init(tokens.slice(1));
        case "canvas":
          return this.canvas(tokens.slice(1));
        case "create":
          return this.create(tokens.slice(1));
        case "delete":
          if (tokens.length !== 2 || tokens[1] === undefined) {
            throw new EditorError("usage: delete <id>");
          }
          return [this.describeChange(this.session.delete(tokens[1]))];
        case "move":
          return this.move(tokens.slice(1));
        case "scale":
          return this.scale(tokens.slice(1));
        case "set":
          return this.set(tokens.slice(1));
        case "group":
          return this.group(tokens.slice(1));
        case "ungroup":
          if (tokens.length !== 2 || tokens[1] === undefined) {
            throw new EditorError("usage: ungroup <gid>");
          }
          return [this.describeChange(this.session.ungroup(tokens[1]))];
        case "addto":
          if (tokens.length !== 3 || tokens[1] === undefined || tokens[2] === undefined) {
            throw new EditorError("usage: addto <gid> <id>");
          }
          return [this.describeChange(this.session.addTo(tokens[1], tokens[2]))];
        case "tree":
          return this.tree(tokens.slice(1));
        case "undo":
          this.noArguments(tokens);
          return [this.describeChange(this.session.undo())];
        case "redo":
          this.noArguments(tokens);
          return [this.describeChange(this.session.redo())];
        case "help":
          this.noArguments(tokens);
          return [
            "Commands available now: init, canvas, create, delete, move, scale, set, group, ungroup, addto, tree, undo, redo"
          ];
        default:
          throw new EditorError(`unknown command: ${command}`);
      }
    } catch (error) {
      if (error instanceof EditorError) {
        return [`error: ${error.message}`];
      }
      throw error;
    }
  }

  private init(arguments_: readonly string[]): string[] {
    if (arguments_.length !== 0 && arguments_.length !== 2) {
      throw new EditorError("usage: init [w] [h]");
    }
    const width = arguments_.length === 0 ? 800 : Number(arguments_[0]);
    const height = arguments_.length === 0 ? 600 : Number(arguments_[1]);
    const canvas = this.session.init(width, height);
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
    const parent = change.parentLabel === undefined ? "" : ` in ${change.parentLabel}`;
    return `${change.label} created${parent}`;
  }
}
