import { EditorError } from "../../src/core/plugin-api";
import type { Command } from "../../src/core/plugin-api";
import type { DirectoryEntry, DirectoryReader } from "./DirectoryReader";

/** Formats one non-recursive snapshot supplied through the directory port. */
export class DirCommand implements Command {
  readonly name = "dir";
  readonly help = "dir";

  constructor(private readonly reader: DirectoryReader) {}

  execute(args: readonly string[]): readonly string[] {
    if (args.length !== 0) throw new EditorError("usage: dir");

    const path = this.reader.currentPath();
    let entries: readonly DirectoryEntry[];
    try {
      entries = this.reader.read(path);
    } catch {
      throw new EditorError(`cannot read directory: ${path}`);
    }

    const visible = entries.filter((entry) => entry.name !== "." && entry.name !== "..");
    const directories = this.names(visible, "directory").map((name) => `[DIR]  ${name}`);
    const files = this.names(visible, "file").map((name) => `[FILE]  ${name}`);
    const lines = [...directories, ...files];
    return lines.length === 0 ? ["(empty directory)"] : lines;
  }

  private names(entries: readonly DirectoryEntry[], kind: DirectoryEntry["kind"]): string[] {
    return entries
      .filter((entry) => entry.kind === kind)
      .map((entry) => entry.name)
      .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  }
}
