export type DirectoryEntryKind = "directory" | "file" | "other";

export interface DirectoryEntry {
  readonly name: string;
  readonly kind: DirectoryEntryKind;
}

/** Client-owned port that keeps Node directory types out of command logic. */
export interface DirectoryReader {
  currentPath(): string;
  read(path: string): readonly DirectoryEntry[];
}
