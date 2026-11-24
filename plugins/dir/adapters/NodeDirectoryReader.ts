import { readdirSync } from "node:fs";
import process from "node:process";
import type { DirectoryEntry, DirectoryReader } from "../DirectoryReader";

/** Adapts Node's process and Dirent APIs to the plugin-owned directory port. */
export class NodeDirectoryReader implements DirectoryReader {
  constructor(private readonly workingDirectory: () => string = () => process.cwd()) {}

  currentPath(): string {
    return this.workingDirectory();
  }

  read(path: string): readonly DirectoryEntry[] {
    return readdirSync(path, { withFileTypes: true }).map((entry) => ({
      name: entry.name,
      kind: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other"
    }));
  }
}
