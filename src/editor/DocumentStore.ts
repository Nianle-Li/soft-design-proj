import type { SvgDocument } from "../model/SvgDocument";

/** Client-owned storage contract; XML and file APIs stay outside the editor. */
export interface DocumentStore {
  read(path: string): Readonly<{
    document: SvgDocument;
    count: number;
    assignedIds: readonly Readonly<{ id: string; tag: string }>[];
  }>;
  write(path: string, document: SvgDocument): number;
}
